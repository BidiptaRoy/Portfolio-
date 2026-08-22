import { z } from "zod";

/**
 * Runtime schemas for every content entity.
 *
 * These earn their keep three times over the life of the project:
 *   1. Now — content modules are parsed at import, so a typo in a slug or a
 *      malformed date fails the build instead of shipping.
 *   2. Phase 6 — the same schemas validate `prisma/seed.ts` input.
 *   3. Phase 8 — the admin forms and every Server Action parse with these.
 *
 * Keep them in step with `src/types/content.ts`. The `satisfies` checks in
 * `src/content/*` will complain if the two drift apart.
 */

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
    kind: z.enum(["TECHNICAL", "PROFESSIONAL"]),
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
