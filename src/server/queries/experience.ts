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
}> {
  const all = published(experience);
  return {
    technical: all.filter((entry) => entry.kind === "TECHNICAL"),
    professional: all.filter((entry) => entry.kind === "PROFESSIONAL"),
  };
}

/** The current role, if any — used for the "currently" line on the home page. */
export async function getCurrentExperience(): Promise<Experience | null> {
  return published(experience).find((entry) => entry.current) ?? null;
}
