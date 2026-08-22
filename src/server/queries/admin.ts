import "server-only";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import type { Project } from "@/types/content";

/**
 * Admin reads — the ONLY queries that return unpublished records.
 *
 * Kept in a separate file from the public façade on purpose. Everything in
 * `src/server/queries/projects.ts` filters to PUBLISHED, and that filter is
 * what keeps drafts off the public site. If admin and public queries lived
 * side by side, sooner or later a page would import the wrong one and quietly
 * publish a draft. The filename is the reminder.
 *
 * Every function here calls `requireAdmin()` first. That is redundant with
 * the layout check in normal use, and deliberately so: these functions must
 * be safe to call from anywhere, including a future Route Handler or action
 * that forgets to check.
 */

/** Includes drafts. Never call from a public page. */
export async function getProjectsForAdmin(): Promise<Project[]> {
  await requireAdmin();

  return prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      slug: true,
      title: true,
      summary: true,
      description: true,
      role: true,
      featured: true,
      startedAt: true,
      completedAt: true,
      tech: true,
      repoUrl: true,
      liveUrl: true,
      outcomes: true,
      challenges: true,
      status: true,
      sortOrder: true,
    },
  });
}

/** Includes drafts. Never call from a public page. */
export async function getProjectForAdmin(slug: string): Promise<Project | null> {
  await requireAdmin();

  return prisma.project.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      summary: true,
      description: true,
      role: true,
      featured: true,
      startedAt: true,
      completedAt: true,
      tech: true,
      repoUrl: true,
      liveUrl: true,
      outcomes: true,
      challenges: true,
      status: true,
      sortOrder: true,
    },
  });
}

/** Counts for the dashboard, including drafts. */
export async function getAdminCounts() {
  await requireAdmin();

  const [projects, drafts, experience, education, skills] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.experience.count(),
    prisma.education.count(),
    prisma.skill.count(),
  ]);

  return { projects, drafts, experience, education, skills };
}
