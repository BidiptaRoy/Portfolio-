import { redirect } from "next/navigation";

import { getReferralLink } from "@/server/queries/services";

/**
 * Outbound referral redirect: `/r/[slug]` → the destination stored on the row.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Why this route exists at all, when a plain <a href> would work today
 * ─────────────────────────────────────────────────────────────────────────
 *
 * docs/architecture.md lists this as one of three seams cut early because they
 * cost nothing now and are expensive to retrofit. Every outbound Taskrabbit
 * link in the application points here rather than at the destination, so
 * adding click tracking later is one insert statement in one file — no page
 * edits, no link audit, and no links quietly left pointing off-site because
 * somebody missed them.
 *
 * It also means a referral URL or promo code can change in one row without a
 * deploy, and that any link already shared — in a message, on a card, in
 * somebody's bookmarks — keeps working and follows the new destination.
 *
 * A Route Handler rather than a page: there is nothing to render, and a page
 * would briefly paint before redirecting.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext<"/r/[slug]">) {
  const { slug } = await params;

  const link = await getReferralLink(slug);

  if (!link) {
    /*
      /services rather than a 404, and this is a judgement call worth stating.

      An unknown or retired slug is a normal thing to hit: codes get shared,
      and they outlive the campaign that made them. But everyone who follows
      one of these links was, a moment ago, someone considering hiring him. A
      404 loses that person to a dead end; the services page answers the
      question they actually had.

      The tradeoff is that a broken link is less obvious to us. Acceptable —
      this route is deliberately the only place outbound links resolve, so
      there is exactly one row to check when a code stops working.

      `getReferralLink` filters to PUBLISHED, so unpublishing a row retires a
      code while keeping the record of it.
    */
    redirect("/services");
  }

  /*
    307, the default from `redirect()` in a Route Handler. Deliberately NOT a
    permanent redirect: browsers cache a 308 aggressively and would keep
    sending visitors to the old destination after the row changed, which is
    precisely the flexibility this route exists to preserve.
  */
  redirect(link.url);
}
