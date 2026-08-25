import { assertUniqueSlugs, serviceSchema } from "@/lib/validation/content";
import type { Service } from "@/types/content";

/**
 * Services offered directly to clients, sourced through Taskrabbit.
 *
 * ⚠ SEED SOURCE ONLY, and for this collection that matters more than usual.
 * Since Phase 11 the seed runs against the DEVELOPMENT database, so editing
 * this file changes nothing on the live site — services are created and edited
 * at `/admin/services` in production. This file is what a fresh database
 * starts with, and a record of the wording that was agreed.
 *
 * Everything here comes from Bidipta's own description of the work (the same
 * account behind the Taskrabbit entry in `experience.ts`). Nothing is
 * inferred, and in particular:
 *
 *   - **No rates.** Pricing is quoted per task on the platform. A figure
 *     printed here is a promise to a stranger that nobody remembers making.
 *   - **No availability claims.** He fits this around classes; "same day" or
 *     "7 days a week" would be a commitment he has not made.
 *   - **No testimonials or job counts.** The portfolio dropped an unverifiable
 *     stat bar in Phase 3 for exactly this reason. Same standard applies here.
 *
 * Those are the fields a future version fills in from the CMS, not from here.
 */
export const services: Service[] = [
  {
    slug: "moving-assistance",
    name: "Moving assistance",
    summary: "Move-in and move-out help for apartments, including the heavy and awkward parts.",
    description:
      "Loading, unloading, carrying, and placing furniture and boxes for an apartment move. " +
      "Most of this work clusters around the end and start of the month, which is when " +
      "leases turn over and when help is hardest to find.",
    includes: [
      "Move-in and move-out support for apartment clients",
      "Loading and unloading a vehicle or truck",
      "Carrying items up and down stairs",
      "Placing furniture where you actually want it",
    ],
    serviceArea: "Boston, MA · Greater New York",
    pricingNote: null,
  },
  {
    slug: "home-packing",
    name: "Home packing",
    summary: "Packing a home for a move, from a single room to the whole place.",
    description:
      "Wrapping, boxing, and labelling the contents of a home so that the move itself is " +
      "the short part. Can be done ahead of moving day or alongside it.",
    includes: [
      "Full-home packing for residential moves",
      "Room-by-room packing where that is all you need",
      "Labelling so unpacking is not a second puzzle",
    ],
    serviceArea: "Boston, MA · Greater New York",
    pricingNote: null,
  },
  {
    slug: "handyman-and-assembly",
    name: "Handyman and assembly",
    summary: "Furniture assembly and general around-the-home tasks.",
    description:
      "Flat-pack furniture assembly and the general small jobs that accumulate in a home " +
      "and never quite reach the top of the list.",
    includes: [
      "Flat-pack and boxed furniture assembly",
      "General handyman tasks around the home",
      "Mounting and installation within reason",
    ],
    serviceArea: "Boston, MA · Greater New York",
    pricingNote: null,
  },
].map((entry, index) => serviceSchema.parse({ ...entry, status: "PUBLISHED", sortOrder: index }));

assertUniqueSlugs(services, "services");
