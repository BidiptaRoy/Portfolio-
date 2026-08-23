import "server-only";

import { prisma } from "@/lib/db";
import type { ProjectSummary, ProjectWithImages } from "@/types/content";

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

const imageFields = {
  id: true,
  url: true,
  alt: true,
  caption: true,
  width: true,
  height: true,
  sortOrder: true,
} as const;

/**
 * Images have no `status` of their own — a project's gallery is published
 * exactly when the project is. See the note on the Prisma model.
 */
const gallery = {
  select: imageFields,
  orderBy: { sortOrder: "asc" },
} as const;

/** Just the first image, for a card thumbnail. See `ProjectSummary`. */
const cover = { ...gallery, take: 1 } as const;

/**
 * Prisma returns a relation as an array whatever the `take`, so a "cover"
 * arrives as a zero- or one-element list. Flattened here rather than in the
 * components, so no page has to know that.
 */
function withCover<T extends { images: ProjectSummary["cover"][] }>(
  row: T,
): Omit<T, "images"> & { cover: ProjectSummary["cover"] } {
  const { images, ...rest } = row;
  return { ...rest, cover: images[0] ?? null };
}

export async function getProjects(): Promise<ProjectSummary[]> {
  const rows = await prisma.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: { ...projectFields, images: cover },
  });

  return rows.map(withCover);
}

export async function getFeaturedProjects(limit?: number): Promise<ProjectSummary[]> {
  const rows = await prisma.project.findMany({
    where: { status: "PUBLISHED", featured: true },
    orderBy: { sortOrder: "asc" },
    select: { ...projectFields, images: cover },
    ...(typeof limit === "number" ? { take: limit } : {}),
  });

  return rows.map(withCover);
}

export async function getProjectBySlug(slug: string): Promise<ProjectWithImages | null> {
  return prisma.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { ...projectFields, images: gallery },
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
