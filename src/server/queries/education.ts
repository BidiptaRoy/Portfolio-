import "server-only";

import { education } from "@/content/education";
import type { Education } from "@/types/content";

/** Read façade for education. See `./projects.ts` for rationale. */

export async function getEducation(): Promise<Education[]> {
  return education
    .filter((entry) => entry.status === "PUBLISHED")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
