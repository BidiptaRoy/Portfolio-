import "server-only";

import { projects } from "@/content/projects";
import type { Project } from "@/types/content";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * READ FAÇADE — the only module that knows where project data comes from.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Components call these functions. They never import `@/content/*`, and in
 * Phase 6 they will not import Prisma either — only the bodies below change.
 *
 * Every function is `async` and returns a Promise even though the current
 * implementation is synchronous. That is deliberate: a synchronous API would
 * leak the file-based implementation into every caller, and swapping to
 * Prisma later would then force a change at every call site — exactly the
 * rewrite this seam exists to prevent. See docs/decisions/0004.
 *
 * Public queries filter to PUBLISHED. Drafts must never leave the server.
 */

const published = (items: Project[]) =>
  items.filter((item) => item.status === "PUBLISHED").sort((a, b) => a.sortOrder - b.sortOrder);

export async function getProjects(): Promise<Project[]> {
  return published(projects);
}

export async function getFeaturedProjects(limit?: number): Promise<Project[]> {
  const featured = published(projects).filter((project) => project.featured);
  return typeof limit === "number" ? featured.slice(0, limit) : featured;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return published(projects).find((project) => project.slug === slug) ?? null;
}

/** Every published project slug — for `generateStaticParams` and the sitemap. */
export async function getProjectSlugs(): Promise<string[]> {
  return published(projects).map((project) => project.slug);
}

/** Distinct technologies across published projects, for the filter UI. */
export async function getProjectTechnologies(): Promise<string[]> {
  const seen = new Set<string>();
  for (const project of published(projects)) {
    for (const tech of project.tech) seen.add(tech);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
