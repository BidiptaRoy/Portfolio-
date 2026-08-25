import "server-only";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import type {
  Education,
  Experience,
  Profile,
  Project,
  ProjectImage,
  ReferralLink,
  ResumeVersion,
  Service,
  Skill,
} from "@/types/content";

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

/**
 * A project's gallery, in display order.
 *
 * Separate from `getProjectForAdmin` rather than an `include` on it, because
 * the edit form does not want images and the image manager does not want the
 * form's twelve text columns. Two queries on one page is cheaper than either
 * one over-fetching.
 */
export async function getProjectImagesForAdmin(slug: string): Promise<ProjectImage[]> {
  await requireAdmin();

  return prisma.projectImage.findMany({
    where: { project: { slug } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      url: true,
      alt: true,
      caption: true,
      width: true,
      height: true,
      sortOrder: true,
    },
  });
}

/** Includes drafts. Every revision, newest intent first. */
export type AdminResumeVersion = ResumeVersion & { id: string };

export async function getResumeVersionsForAdmin(): Promise<AdminResumeVersion[]> {
  await requireAdmin();

  return prisma.resumeVersion.findMany({
    orderBy: [{ sortOrder: "asc" }, { revisedAt: "desc" }],
    select: {
      id: true,
      label: true,
      fileUrl: true,
      downloadUrl: true,
      pathname: true,
      downloadName: true,
      revisedAt: true,
      isCurrent: true,
      status: true,
      sortOrder: true,
    },
  });
}

/**
 * The contact inbox, newest first.
 *
 * `ipHash` and `userAgent` are not selected. They exist to rate-limit, not to
 * profile anyone, and putting them on screen would invite treating them as
 * information about a person rather than as a counter.
 */
export type AdminMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  notifiedAt: Date | null;
  createdAt: Date;
};

export async function getMessagesForAdmin(): Promise<AdminMessage[]> {
  await requireAdmin();

  return prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      read: true,
      notifiedAt: true,
      createdAt: true,
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

/**
 * The admin also sees `photoPathname`, which the public façade does not: it
 * is a storage location, not content, and no page has any use for it.
 */
export type AdminProfile = Profile & { photoPathname: string | null };

/** Null when the singleton has never been created. The form handles that. */
export async function getProfileForAdmin(): Promise<AdminProfile | null> {
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
      photoUrl: true,
      photoPathname: true,
    },
  });
}

// ── Services (Phase 12) ────────────────────────────────────────────────────

/** Includes drafts. Never call from a public page. */
export async function getServicesForAdmin(): Promise<Service[]> {
  await requireAdmin();

  return prisma.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      summary: true,
      description: true,
      includes: true,
      serviceArea: true,
      pricingNote: true,
      status: true,
      sortOrder: true,
    },
  });
}

export async function getServiceForAdmin(slug: string): Promise<Service | null> {
  await requireAdmin();

  return prisma.service.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      summary: true,
      description: true,
      includes: true,
      serviceArea: true,
      pricingNote: true,
      status: true,
      sortOrder: true,
    },
  });
}

/** Includes drafts — a retired promo code is an unpublished row. */
export async function getReferralLinksForAdmin(): Promise<ReferralLink[]> {
  await requireAdmin();

  return prisma.referralLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      slug: true,
      label: true,
      url: true,
      promoCode: true,
      description: true,
      status: true,
      sortOrder: true,
    },
  });
}

export async function getReferralLinkForAdmin(slug: string): Promise<ReferralLink | null> {
  await requireAdmin();

  return prisma.referralLink.findUnique({
    where: { slug },
    select: {
      slug: true,
      label: true,
      url: true,
      promoCode: true,
      description: true,
      status: true,
      sortOrder: true,
    },
  });
}

/** Counts for the dashboard, including drafts. */
export async function getAdminCounts() {
  await requireAdmin();

  const [
    projects,
    drafts,
    experience,
    education,
    skills,
    images,
    resumes,
    publishedResumes,
    unreadMessages,
    unsentNotifications,
    services,
    serviceDrafts,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.experience.count(),
    prisma.education.count(),
    prisma.skill.count(),
    prisma.projectImage.count(),
    prisma.resumeVersion.count(),
    prisma.resumeVersion.count({ where: { status: "PUBLISHED" } }),
    prisma.contactMessage.count({ where: { read: false } }),
    // Messages that were saved but never emailed. Surfaced on the dashboard
    // because a broken notification pipeline is otherwise indistinguishable
    // from an empty inbox.
    prisma.contactMessage.count({ where: { notifiedAt: null } }),
    prisma.service.count(),
    prisma.service.count({ where: { status: "DRAFT" } }),
  ]);

  return {
    projects,
    drafts,
    experience,
    education,
    skills,
    images,
    resumes,
    publishedResumes,
    unreadMessages,
    unsentNotifications,
    services,
    serviceDrafts,
  };
}
