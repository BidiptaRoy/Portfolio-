import "server-only";

import { prisma } from "@/lib/db";
import type { ResumeVersion } from "@/types/content";

/** Read façade for resume files. See `./projects.ts` for rationale. */

/**
 * The resume to offer for download, or null if none is published.
 *
 * Returning null is a supported state, not an error: the Resume page renders
 * without a download link when every revision is held back as a draft.
 */
export async function getCurrentResume(): Promise<ResumeVersion | null> {
  const fields = {
    label: true,
    fileUrl: true,
    downloadName: true,
    revisedAt: true,
    isCurrent: true,
    status: true,
    sortOrder: true,
  } as const;

  const current = await prisma.resumeVersion.findFirst({
    where: { status: "PUBLISHED", isCurrent: true },
    orderBy: { sortOrder: "asc" },
    select: fields,
  });

  if (current) return current;

  // Fall back to the first published revision, so a forgotten `isCurrent`
  // flag degrades to an older resume rather than to no resume at all.
  return prisma.resumeVersion.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: fields,
  });
}
