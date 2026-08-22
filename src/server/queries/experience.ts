import "server-only";

import { prisma } from "@/lib/db";
import type { Experience, ExperienceKind } from "@/types/content";

/** Read façade for experience. See `./projects.ts` for the rationale. */

const experienceFields = {
  slug: true,
  kind: true,
  engagementType: true,
  title: true,
  organization: true,
  platform: true,
  location: true,
  startDate: true,
  endDate: true,
  current: true,
  summary: true,
  highlights: true,
  skills: true,
  status: true,
  sortOrder: true,
} as const;

export async function getExperience(): Promise<Experience[]> {
  return prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: experienceFields,
  });
}

export async function getExperienceByKind(kind: ExperienceKind): Promise<Experience[]> {
  return prisma.experience.findMany({
    where: { status: "PUBLISHED", kind },
    orderBy: { sortOrder: "asc" },
    select: experienceFields,
  });
}

/**
 * All three sections in one query, so the Experience page does not need to
 * know which kinds exist. Empty sections are omitted by the page rather than
 * rendered as bare headings.
 */
export async function getExperienceBySection(): Promise<{
  technical: Experience[];
  professional: Experience[];
  leadership: Experience[];
}> {
  const all = await getExperience();

  return {
    technical: all.filter((entry) => entry.kind === "TECHNICAL"),
    professional: all.filter((entry) => entry.kind === "PROFESSIONAL"),
    leadership: all.filter((entry) => entry.kind === "LEADERSHIP"),
  };
}

/**
 * The single role to headline on the home page.
 *
 * Several roles can be current at once — a term-time internship, a seasonal
 * coaching job, and an elected club office can all be live in the same month.
 * Technical work is what the primary audience is here for, so it wins.
 */
export async function getCurrentExperience(): Promise<Experience | null> {
  const technical = await prisma.experience.findFirst({
    where: { status: "PUBLISHED", current: true, kind: "TECHNICAL" },
    orderBy: { sortOrder: "asc" },
    select: experienceFields,
  });

  if (technical) return technical;

  return prisma.experience.findFirst({
    where: { status: "PUBLISHED", current: true },
    orderBy: { sortOrder: "asc" },
    select: experienceFields,
  });
}

/** Every current role — for the About page, where all of them are relevant. */
export async function getCurrentExperiences(): Promise<Experience[]> {
  return prisma.experience.findMany({
    where: { status: "PUBLISHED", current: true },
    orderBy: { sortOrder: "asc" },
    select: experienceFields,
  });
}
