import { z } from "zod";

/**
 * Runtime schemas for every content entity.
 *
 * These earn their keep three times over the life of the project:
 *   1. Now — content modules parse themselves at import.
 *   2. Phase 6 — the same schemas validate `prisma/seed.ts` input.
 *   3. Phase 8 — the admin forms and every Server Action parse with these.
 *
 * Keep them in step with `src/types/content.ts`.
 *
 * ⚠ IMPORTANT LIMITATION, verified by planting a duplicate slug and watching
 * the build pass: these checks run at MODULE IMPORT, so they only fire for
 * content that a rendered page actually reaches. A collection no page imports
 * is never evaluated, and therefore never validated.
 *
 * Phase 4 wires every collection into a page, which closes most of the gap.
 * The real fix is a test that imports all content unconditionally — scheduled
 * for Phase 10. Until then, a green build does NOT mean the content is valid.
 */

/**
 * Asserts every slug in a collection is unique, and returns the collection.
 *
 * The per-item schemas cannot catch this: each duplicate is individually
 * valid. But two entries sharing a slug means two entries sharing a URL, and
 * `getBySlug` silently returns whichever sorts first — a bug that ships
 * quietly and is confusing to track down. Throwing here fails the build.
 */
export function assertUniqueSlugs<T extends { slug: string }>(items: T[], label: string): T[] {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.slug)) {
      throw new Error(`Duplicate ${label} slug: "${item.slug}". Slugs must be unique.`);
    }
    seen.add(item.slug);
  }

  return items;
}

/** "2025" or "2025-11". Year-only is allowed on purpose — see YearMonth. */
const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "Expected YYYY or YYYY-MM");

const contentMeta = {
  status: z.enum(["DRAFT", "PUBLISHED"]),
  sortOrder: z.number().int(),
};

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase, hyphenated slug");

export const projectSchema = z.object({
  ...contentMeta,
  slug,
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  role: z.string().min(1).nullable(),
  featured: z.boolean(),
  startedAt: yearMonth.nullable(),
  completedAt: yearMonth.nullable(),
  tech: z.array(z.string().min(1)),
  repoUrl: z.url().nullable(),
  liveUrl: z.url().nullable(),
  outcomes: z.array(z.string().min(1)),
  challenges: z.array(z.string().min(1)),
});

export const experienceSchema = z
  .object({
    ...contentMeta,
    slug,
    kind: z.enum(["TECHNICAL", "PROFESSIONAL", "LEADERSHIP"]),
    engagementType: z.enum([
      "INTERNSHIP",
      "EMPLOYMENT",
      "CONTRACT",
      "PLATFORM_ENGAGEMENT",
      "VOLUNTEER",
      "MEMBERSHIP",
    ]),
    title: z.string().min(1),
    organization: z.string().min(1).nullable(),
    platform: z.string().min(1).nullable(),
    location: z.string().min(1).nullable(),
    startDate: yearMonth,
    endDate: yearMonth.nullable(),
    current: z.boolean(),
    summary: z.string().min(1),
    highlights: z.array(z.string().min(1)),
    skills: z.array(z.string().min(1)),
  })
  // A role cannot be both ongoing and finished. Without this, a stale
  // `endDate` left behind when something is marked current would render as
  // "May 2026 – Aug 2026 · Present".
  .refine((value) => (value.current ? value.endDate === null : value.endDate !== null), {
    message: "Set endDate to null when current is true, and provide one otherwise",
    path: ["endDate"],
  });

export const educationSchema = z.object({
  ...contentMeta,
  slug,
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  location: z.string().min(1).nullable(),
  startDate: yearMonth,
  endDate: yearMonth.nullable(),
  expected: z.boolean(),
  highlights: z.array(z.string().min(1)),
});

export const skillSchema = z.object({
  ...contentMeta,
  name: z.string().min(1),
  category: z.enum(["LANGUAGE", "FRAMEWORK", "DATABASE", "TOOL", "PRACTICE"]),
});

export const resumeVersionSchema = z.object({
  ...contentMeta,
  label: z.string().min(1),
  fileUrl: z.string().min(1),
  downloadName: z.string().min(1),
  updatedAt: yearMonth,
  isCurrent: z.boolean(),
});

export const socialLinkSchema = z.object({
  ...contentMeta,
  platform: z.enum(["GITHUB", "LINKEDIN", "EMAIL"]),
  label: z.string().min(1),
  url: z.string().min(1),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  shortBio: z.string().min(1),
  longBio: z.array(z.string().min(1)).min(1),
  location: z.string().min(1),
  email: z.email(),
  availability: z.string().min(1).nullable(),
});
