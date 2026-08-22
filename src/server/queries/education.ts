import "server-only";

import { prisma } from "@/lib/db";
import type { Education } from "@/types/content";

/** Read façade for education. See `./projects.ts` for rationale. */

export async function getEducation(): Promise<Education[]> {
  return prisma.education.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      institution: true,
      degree: true,
      field: true,
      location: true,
      startDate: true,
      endDate: true,
      expected: true,
      highlights: true,
      status: true,
      sortOrder: true,
    },
  });
}
