"use server";

import { after } from "next/server";

import { prisma } from "@/lib/db";
import { sendContactNotification } from "@/lib/email";
import {
  contactFormSchema,
  HONEYPOT_FIELD,
  invalidForm,
  MIN_FILL_MILLISECONDS,
  type FormState,
} from "@/lib/validation/forms";
import { getProfile } from "@/server/queries/profile";
import { checkContactRateLimit, RATE_LIMIT_MESSAGE } from "@/server/rate-limit";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * THE ONLY UNAUTHENTICATED WRITE IN THIS CODEBASE.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * `requireAdmin()` is absent from `submitContactMessage` ON PURPOSE. Every
 * other action in src/server/actions calls it as its first statement, and the
 * audit in docs/roadmap.md exists to catch one that forgets. This is not one
 * that forgot — a contact form that requires you to be the site's owner is
 * not a contact form.
 *
 * If you are adding an action to this file, it almost certainly needs
 * `requireAdmin()`. Marking messages read and deleting them live in
 * ./contact-admin.ts precisely so that this file stays the single, obvious,
 * public surface rather than a mix of guarded and unguarded exports.
 *
 * What stands in for the auth check, weakest to strongest:
 *
 *   1. A honeypot field, hidden from both sight and screen readers.
 *   2. A minimum fill time. Browser-supplied, therefore forgeable — it stops
 *      naive bots and nothing else.
 *   3. Zod parsing with a length cap on every field.
 *   4. A database-backed rate limit, per sender and global. This is the one
 *      that actually holds; see src/server/rate-limit.ts for why it is not
 *      an in-memory counter.
 *
 * Nothing submitted here is ever rendered as markup, and no field reaches an
 * email as HTML — see src/lib/email.ts.
 */
export async function submitContactMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  /*
    The honeypot is checked first and answers with SUCCESS.

    Telling a bot it was caught teaches whoever wrote it to stop filling the
    field in. A silent accept costs nothing, writes nothing, and leaves the
    trap working. The visitor this branch lies to does not exist.
  */
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { error: null, fieldErrors: {}, success: true };
  }

  // Same treatment for an implausibly fast submission.
  const renderedAt = Number(formData.get("renderedAt"));
  if (Number.isFinite(renderedAt) && Date.now() - renderedAt < MIN_FILL_MILLISECONDS) {
    return { error: null, fieldErrors: {}, success: true };
  }

  const parsed = contactFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error);

  // After validation, so a malformed flood does not consume the allowance a
  // real sender needs — and before the write, which is what it protects.
  const verdict = await checkContactRateLimit();
  if (!verdict.allowed) {
    return { error: RATE_LIMIT_MESSAGE, fieldErrors: {} };
  }

  const { name, email, subject, message } = parsed.data;

  /*
    THE ROW IS THE RECORD. It is written before any email is attempted, and
    the visitor's confirmation depends on this succeeding and nothing else.
    A message that reached the database is a message that was received, even
    if every mail provider on earth is down.
  */
  const saved = await prisma.contactMessage.create({
    data: {
      name,
      email,
      subject,
      message,
      ipHash: verdict.ipHash,
      userAgent: null,
    },
    select: { id: true },
  });

  /*
    The notification goes out AFTER the response. `after()` runs once the
    reply has been sent, so nobody waits several hundred milliseconds on an
    API call whose outcome does not change what they are told.

    A failure here is recorded rather than raised: `notifiedAt` stays null and
    the admin inbox flags it. That is what keeps an unnoticed email outage
    from looking identical to nobody writing in.
  */
  after(async () => {
    const profile = await getProfile();

    const result = await sendContactNotification({
      name,
      email,
      subject,
      message,
      fallbackTo: profile.email,
    });

    if (result.ok) {
      await prisma.contactMessage.update({
        where: { id: saved.id },
        data: { notifiedAt: new Date() },
      });
    } else {
      console.error(`Contact message ${saved.id} saved but not emailed: ${result.reason}`);
    }
  });

  // No revalidation: nothing public renders messages, and the admin inbox is
  // dynamic. Revalidating here would only clear caches for no reason.
  return { error: null, fieldErrors: {}, success: true };
}
