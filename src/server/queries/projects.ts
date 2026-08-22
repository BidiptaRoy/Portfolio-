import "server-only";

import { prisma } from "@/lib/db";
import type { Project } from "@/types/content";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * READ FAÇADE — the only module that knows where project data comes from.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * As of Phase 6 the source is Postgres. Before that it was the typed modules
 * in src/content, and **not one component changed when this was swapped** —
 * which is the entire reason this layer exists. See docs/decisions/0004.
 *
 * src/content is now the seed source, not the runtime source. Editing a file
 * there changes nothing until `npm run db:seed` runs.
 *
 * Public queries filter to PUBLISHED. Drafts must never leave the server.
 */

/**
 * Selected explicitly rather than returning whole rows. Two reasons: the
 * result is then structurally exactly `Project`, so no mapping layer is
 * needed; and internal columns (id, timestamps) never leak into a component
 * that might start depending on them.
 */
const projectFields = {
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
} as const;

export async function getProjects(): Promise<Project[]> {
  return prisma.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: projectFields,
  });
}

export async function getFeaturedProjects(limit?: number): Promise<Project[]> {
  return prisma.project.findMany({
    where: { status: "PUBLISHED", featured: true },
    orderBy: { sortOrder: "asc" },
    select: projectFields,
    ...(typeof limit === "number" ? { take: limit } : {}),
  });
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return prisma.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: projectFields,
  });
}

/** Every published project slug — for `generateStaticParams` and the sitemap. */
export async function getProjectSlugs(): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: { slug: true },
  });

  return rows.map((row) => row.slug);
}

/**
 * Distinct technologies across published projects, for the filter UI.
 *
 * Deduplicated in application code because `tech` is a Postgres array column;
 * a DISTINCT over array elements would need `unnest` and raw SQL. At this
 * scale that is not worth leaving the type-safe query builder.
 */
export async function getProjectTechnologies(): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { status: "PUBLISHED" },
    select: { tech: true },
  });

  const seen = new Set<string>();
  for (const row of rows) {
    for (const tech of row.tech) seen.add(tech);
  }

  return [...seen].sort((a, b) => a.localeCompare(b));
}
