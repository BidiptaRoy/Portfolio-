import "server-only";

import { resumeVersions } from "@/content/resume";
import type { ResumeVersion } from "@/types/content";

/** Read façade for resume files. See `./projects.ts` for rationale. */

/**
 * The resume to offer for download, or null if none is published.
 *
 * Returning null is a supported state, not an error: the Resume page renders
 * without a download link when a revision is held back as a draft.
 */
export async function getCurrentResume(): Promise<ResumeVersion | null> {
  const published = resumeVersions
    .filter((entry) => entry.status === "PUBLISHED")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return published.find((entry) => entry.isCurrent) ?? published[0] ?? null;
}
