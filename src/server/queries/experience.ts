import "server-only";

import { experience } from "@/content/experience";
import type { Experience, ExperienceKind } from "@/types/content";

/** Read façade for experience. See `./projects.ts` for the rationale. */

const published = (items: Experience[]) =>
  items.filter((item) => item.status === "PUBLISHED").sort((a, b) => a.sortOrder - b.sortOrder);

export async function getExperience(): Promise<Experience[]> {
  return published(experience);
}

export async function getExperienceByKind(kind: ExperienceKind): Promise<Experience[]> {
  return published(experience).filter((entry) => entry.kind === kind);
}

/**
 * Both sections in one pass, so the Experience page does not need to know
 * which kinds exist. If a section is empty the page can omit it rather than
 * rendering an empty heading.
 */
export async function getExperienceBySection(): Promise<{
  technical: Experience[];
  professional: Experience[];
  leadership: Experience[];
}> {
  const all = published(experience);
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
 * Technical work is what the primary audience is here for, so it wins; only
 * if there is none does this fall back to any current role.
 */
export async function getCurrentExperience(): Promise<Experience | null> {
  const current = published(experience).filter((entry) => entry.current);
  return current.find((entry) => entry.kind === "TECHNICAL") ?? current[0] ?? null;
}

/** Every current role — for the About page, where all of them are relevant. */
export async function getCurrentExperiences(): Promise<Experience[]> {
  return published(experience).filter((entry) => entry.current);
}
