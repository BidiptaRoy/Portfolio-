import "server-only";

import { prisma } from "@/lib/db";
import type { ReferralLink, Service } from "@/types/content";

/**
 * Read façade for the services area. See `./projects.ts` for rationale.
 *
 * Every read here filters to PUBLISHED, exactly like the rest of the façade.
 * That matters more than usual for referral links: an unpublished one is how a
 * promo code is retired, and a leak would keep an expired offer live on a page
 * that promises it.
 */

export async function getServices(): Promise<Service[]> {
  return prisma.service.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      summary: true,
      description: true,
      includes: true,
      serviceArea: true,
      pricingNote: true,
      status: true,
      sortOrder: true,
    },
  });
}

export async function getReferralLinks(): Promise<ReferralLink[]> {
  return prisma.referralLink.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      label: true,
      url: true,
      promoCode: true,
      description: true,
      status: true,
      sortOrder: true,
    },
  });
}

/**
 * One referral destination by slug, for `/r/[slug]`.
 *
 * Returns null rather than throwing when nothing matches, so the route can
 * answer 404 for an unknown or retired code instead of a 500. A dead referral
 * link is a normal thing to hit — codes get shared and outlive their campaign.
 */
export async function getReferralLink(slug: string): Promise<ReferralLink | null> {
  return prisma.referralLink.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      slug: true,
      label: true,
      url: true,
      promoCode: true,
      description: true,
      status: true,
      sortOrder: true,
    },
  });
}
