import { assertUniqueSlugs, referralLinkSchema } from "@/lib/validation/content";
import type { ReferralLink } from "@/types/content";

/**
 * Outbound referral destinations, as data.
 *
 * These are public by nature — a referral link and a promo code exist to be
 * shared — so they are committed rather than treated as secrets. They are
 * still content, not configuration: they belong behind the CMS so that a code
 * changing does not require a developer and a deploy.
 *
 * Nothing in the application links to `url` directly. Every outbound link goes
 * through `/r/[slug]`, which is the seam that makes click tracking a later
 * decision rather than a later refactor. See docs/architecture.md.
 */
export const referralLinks: ReferralLink[] = [
  {
    slug: "taskrabbit",
    label: "Book on Taskrabbit",
    url: "https://tr.co/bidipta-r",
    promoCode: "TSKGXDEV",
    /*
      Rates live on the Taskrabbit profile and are deliberately not restated
      here. That is not evasiveness — it is the only way they can be right.
      A figure copied onto this site is a figure that goes stale silently,
      while the platform's own listing is always current and is what a client
      is actually charged. So this points, rather than quotes.
    */
    description:
      "Booking, scheduling, payment, and current rates are all handled on Taskrabbit — " +
      "the profile lists everything. The promo code applies to your first task.",
  },
].map((entry, index) =>
  referralLinkSchema.parse({ ...entry, status: "PUBLISHED", sortOrder: index }),
);

assertUniqueSlugs(referralLinks, "referral links");
