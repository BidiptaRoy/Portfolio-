import "server-only";

import { prisma } from "@/lib/db";
import type { Profile, SocialLink } from "@/types/content";

/** Read façade for the profile singleton. See `./projects.ts` for rationale. */

export async function getProfile(): Promise<Profile> {
  const profile = await prisma.profile.findUnique({
    where: { id: "singleton" },
    select: {
      name: true,
      headline: true,
      shortBio: true,
      longBio: true,
      location: true,
      email: true,
      availability: true,
    },
  });

  // Every page depends on this row. Throwing with an actionable message beats
  // rendering a nameless hero and leaving someone to work out why — a missing
  // profile means the database was never seeded, not that content is optional.
  if (!profile) {
    throw new Error(
      "No Profile row found. The database has not been seeded — run `npm run db:seed`.",
    );
  }

  return profile;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  return prisma.socialLink.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: { platform: true, label: true, url: true, status: true, sortOrder: true },
  });
}
