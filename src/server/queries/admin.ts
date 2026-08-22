import "server-only";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import type { Education, Experience, Profile, Project, Skill } from "@/types/content";

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

const experienceFields = {
  slug: true,
  kind: true,
  engagementType: true,
  title: true,
  organization: true,
  platform: true,
  location: true,
  startDate: true,
  endDate: true,
  current: true,
  summary: true,
  highlights: true,
  skills: true,
  status: true,
  sortOrder: true,
} as const;

const educationFields = {
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
} as const;

/** Includes drafts. Never call from a public page. */
export async function getExperienceForAdmin(): Promise<Experience[]> {
  await requireAdmin();
  return prisma.experience.findMany({
    orderBy: [{ sortOrder: "asc" }],
    select: experienceFields,
  });
}

/** Includes drafts. Never call from a public page. */
export async function getExperienceEntryForAdmin(slug: string): Promise<Experience | null> {
  await requireAdmin();
  return prisma.experience.findUnique({ where: { slug }, select: experienceFields });
}

/** Includes drafts. Never call from a public page. */
export async function getEducationForAdmin(): Promise<Education[]> {
  await requireAdmin();
  return prisma.education.findMany({
    orderBy: [{ sortOrder: "asc" }],
    select: educationFields,
  });
}

/** Includes drafts. Never call from a public page. */
export async function getEducationEntryForAdmin(slug: string): Promise<Education | null> {
  await requireAdmin();
  return prisma.education.findUnique({ where: { slug }, select: educationFields });
}

/**
 * Skills carry their `id` in the admin, unlike every other entity here.
 *
 * Skill names are not slugs — "HTML/CSS" contains a slash, which cannot go in
 * a route segment without encoding games. Routing and updating by id avoids
 * the whole class of problem, and lets a skill be renamed freely.
 */
export type AdminSkill = Skill & { id: string };

/** Includes drafts. Never call from a public page. */
export async function getSkillsForAdmin(): Promise<AdminSkill[]> {
  await requireAdmin();
  return prisma.skill.findMany({
    orderBy: [{ sortOrder: "asc" }],
    select: { id: true, name: true, category: true, status: true, sortOrder: true },
  });
}

/** Includes drafts. Never call from a public page. */
export async function getSkillForAdmin(id: string): Promise<AdminSkill | null> {
  await requireAdmin();
  return prisma.skill.findUnique({
    where: { id },
    select: { id: true, name: true, category: true, status: true, sortOrder: true },
  });
}

/** Null when the singleton has never been created. The form handles that. */
export async function getProfileForAdmin(): Promise<Profile | null> {
  await requireAdmin();
  return prisma.profile.findUnique({
    where: { id: "singleton" },
    select: {
      name: true,
      headline: true,
      shortBio: true,
      longBio: true,
      location: true,
      email: true,
      availability: true,
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
