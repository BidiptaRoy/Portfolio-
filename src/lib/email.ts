import "server-only";

import { Resend } from "resend";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * EMAIL FAÇADE — the only module that knows mail is sent through Resend.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Same seam as `src/lib/storage.ts` and `src/server/queries/`: callers ask
 * for a notification to be sent and get back whether it worked. Swapping
 * providers touches this file and nothing else.
 *
 * **Sending is never allowed to fail a request.** Every function here returns
 * a result instead of throwing. The contact form writes its message to the
 * database first and treats the email as a notification on top; if this
 * module cannot send, the visitor is still told their message was received,
 * because it was. See docs/decisions/0008.
 */

export type SendResult = { ok: true; id: string | null } | { ok: false; reason: string };

/**
 * Where notifications go. Falls back to the address on the profile, which is
 * the one already published on the site, so a missing variable degrades to
 * the obvious answer rather than to silence.
 */
function recipient(fallback: string): string {
  return process.env.CONTACT_TO_EMAIL?.trim() || fallback;
}

/**
 * The From address.
 *
 * Until a custom domain is verified with Resend (Phase 11), the only sender
 * permitted is `onboarding@resend.dev`, and Resend will only deliver it to
 * the address the account was registered with. That is workable here because
 * there is exactly one recipient — but it is also why a notification can
 * silently not arrive while the API call reports success.
 */
function sender(): string {
  return process.env.CONTACT_FROM_EMAIL?.trim() || "Portfolio <onboarding@resend.dev>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Tell Bidipta that someone used the contact form.
 *
 * `replyTo` is the sender's address, so hitting reply in a mail client
 * answers the person rather than the robot. The From address stays ours:
 * sending *as* the visitor would fail SPF and land the whole thing in spam.
 */
export async function sendContactNotification({
  name,
  email,
  subject,
  message,
  fallbackTo,
}: {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  fallbackTo: string;
}): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { ok: false, reason: "RESEND_API_KEY is not set" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: sender(),
      to: recipient(fallbackTo),
      replyTo: email,
      subject: subject ? `Portfolio: ${subject}` : `Portfolio: message from ${name}`,
      // Plain text only. The body is attacker-controlled input, and text has
      // no markup to escape and nothing to inject — there is no upside to
      // HTML here that would justify handling that.
      text: [
        `From: ${name} <${email}>`,
        subject ? `Subject: ${subject}` : null,
        "",
        message,
        "",
        "—",
        "Sent from the contact form. Reply to answer the sender directly.",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });

    if (error) {
      console.error("Resend rejected the notification", error);
      return { ok: false, reason: error.message };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("Sending the notification threw", error);
    return { ok: false, reason: error instanceof Error ? error.message : "unknown error" };
  }
}
