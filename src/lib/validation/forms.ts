import { z } from "zod";

/**
 * Schemas for admin form input.
 *
 * Separate from `content.ts` because the shapes genuinely differ: a form
 * submits strings for everything. A checkbox is "on" or absent, a list is a
 * textarea of newlines, and an empty optional field is "" rather than null.
 * These schemas parse that raw shape and transform it into the domain shape,
 * so the actions never hand-roll coercion.
 *
 * These run on the SERVER, on every submission, regardless of what the
 * browser validated. Client validation is a convenience; this is the check.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MONTH_NAMES: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function combine(year: string, month: string): string | false {
  const n = Number(month);
  if (!Number.isInteger(n) || n < 1 || n > 12) return false;
  return `${year}-${String(n).padStart(2, "0")}`;
}

/**
 * Parse the ways a person actually writes a month into the stored
 * "YYYY" / "YYYY-MM" form.
 *
 * The first version of this accepted ONLY the canonical format and rejected
 * everything else. That is technically defensible and practically hostile:
 * typing "June 2025" or "2025-6" into a date field is entirely reasonable,
 * and being turned away for it — behind an error message further up a long
 * form — cost a real edit. Normalize what is unambiguous; reject only what
 * genuinely cannot be read.
 *
 * Returns the canonical string, `null` for empty, or `false` for unparseable.
 */
export function normalizeYearMonth(raw: string): string | null | false {
  const value = raw.trim();
  if (value === "") return null;

  // 2025
  if (/^\d{4}$/.test(value)) return value;

  // 2025-6 · 2025-06 · 2025/6 · 2025.06
  const yearFirst = /^(\d{4})[-/.\s](\d{1,2})$/.exec(value);
  if (yearFirst?.[1] && yearFirst[2]) return combine(yearFirst[1], yearFirst[2]);

  // 6/2025 · 06-2025
  const monthFirst = /^(\d{1,2})[-/.](\d{4})$/.exec(value);
  if (monthFirst?.[1] && monthFirst[2]) return combine(monthFirst[2], monthFirst[1]);

  // June 2025 · Jun 2025 · Jun. 2025
  const named = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(value);
  if (named?.[1] && named[2]) {
    const month = MONTH_NAMES[named[1].toLowerCase()];
    return month ? `${named[2]}-${month}` : false;
  }

  // 2025 June
  const yearNamed = /^(\d{4})\s+([A-Za-z]+)\.?$/.exec(value);
  if (yearNamed?.[1] && yearNamed[2]) {
    const month = MONTH_NAMES[yearNamed[2].toLowerCase()];
    return month ? `${yearNamed[1]}-${month}` : false;
  }

  return false;
}

/** A textarea of one item per line → a trimmed array with blanks dropped. */
const lineList = z.string().transform((value) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0),
);

/** An empty text input means "not set", not an empty string. */
const optionalText = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? null : value));

/**
 * Accepts "2025", "2025-06", "2025-6", "6/2025", "June 2025" and friends,
 * and stores the canonical form. Empty means "not set".
 */
const optionalYearMonth = z
  .string()
  .transform((value) => normalizeYearMonth(value))
  .refine(
    (value): value is string | null => value !== false,
    "Could not read that as a date. Try 2025, 2025-06, or June 2025.",
  );

const optionalUrl = optionalText.refine(
  (value) => value === null || z.url().safeParse(value).success,
  "Must be a full URL including https://",
);

/** An unchecked checkbox is absent from FormData entirely. */
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

export const projectFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(SLUG, "Lowercase letters, numbers and hyphens only"),
  title: z.string().trim().min(1, "Required"),
  summary: z.string().trim().min(1, "Required"),
  description: z.string().trim().min(1, "Required"),
  role: optionalText,
  featured: checkbox,
  startedAt: optionalYearMonth,
  completedAt: optionalYearMonth,
  tech: lineList,
  repoUrl: optionalUrl,
  liveUrl: optionalUrl,
  outcomes: lineList,
  challenges: lineList,
  status: z.enum(["DRAFT", "PUBLISHED"]),
  sortOrder: z.coerce.number().int(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const experienceFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "Required")
      .regex(SLUG, "Lowercase letters, numbers and hyphens only"),
    kind: z.enum(["TECHNICAL", "PROFESSIONAL", "LEADERSHIP"]),
    engagementType: z.enum([
      "INTERNSHIP",
      "EMPLOYMENT",
      "CONTRACT",
      "PLATFORM_ENGAGEMENT",
      "VOLUNTEER",
      "MEMBERSHIP",
    ]),
    title: z.string().trim().min(1, "Required"),
    organization: optionalText,
    platform: optionalText,
    location: optionalText,
    startDate: z
      .string()
      .transform((value) => normalizeYearMonth(value))
      .refine((value) => value !== false && value !== null, "Required — e.g. 2025-06")
      .transform((value) => value as string),
    endDate: optionalYearMonth,
    current: checkbox,
    summary: z.string().trim().min(1, "Required"),
    highlights: lineList,
    skills: lineList,
    status: z.enum(["DRAFT", "PUBLISHED"]),
    sortOrder: z.coerce.number().int(),
  })
  // Mirrors the rule in content.ts. Without it a stale end date left behind
  // when a role is marked current renders as "May 2026 – Aug 2026 · Present".
  .refine((value) => (value.current ? value.endDate === null : value.endDate !== null), {
    message: "Clear the end date for a current role, or set one for a finished role",
    path: ["endDate"],
  });

export const educationFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(SLUG, "Lowercase letters, numbers and hyphens only"),
  institution: z.string().trim().min(1, "Required"),
  degree: z.string().trim().min(1, "Required"),
  field: z.string().trim().min(1, "Required"),
  location: optionalText,
  startDate: z
    .string()
    .transform((value) => normalizeYearMonth(value))
    .refine((value) => value !== false && value !== null, "Required — e.g. 2023-09")
    .transform((value) => value as string),
  endDate: optionalYearMonth,
  expected: checkbox,
  highlights: lineList,
  status: z.enum(["DRAFT", "PUBLISHED"]),
  sortOrder: z.coerce.number().int(),
});

export const serviceFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(SLUG, "Lowercase letters, numbers and hyphens only"),
  name: z.string().trim().min(1, "Required"),
  summary: z.string().trim().min(1, "Required"),
  description: z.string().trim().min(1, "Required"),
  includes: lineList,
  serviceArea: optionalText,
  /*
    Free text, and deliberately not a number field.

    Rates are quoted per task on the platform and change. A price stored as a
    number invites rendering it as one, and a figure on a public page is a
    promise to a stranger that nobody remembers making. If a real rate is ever
    offered, it should arrive as a field with a currency and a review — not by
    someone typing a number into a box labelled "price".
  */
  pricingNote: optionalText,
  status: z.enum(["DRAFT", "PUBLISHED"]),
  sortOrder: z.coerce.number().int(),
});

export const referralLinkFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(SLUG, "Lowercase letters, numbers and hyphens only"),
  label: z.string().trim().min(1, "Required"),
  // A full absolute URL. This field's only job is to send someone off-site, so
  // a malformed value is a dead end for a person about to become a client.
  url: z.url("Enter a full URL, including https://"),
  promoCode: optionalText,
  description: optionalText,
  status: z.enum(["DRAFT", "PUBLISHED"]),
  sortOrder: z.coerce.number().int(),
});

export const skillFormSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  category: z.enum(["LANGUAGE", "FRAMEWORK", "DATABASE", "TOOL", "PRACTICE"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  sortOrder: z.coerce.number().int(),
});

/**
 * Uploads.
 *
 * The FILE ITSELF IS NOT VALIDATED HERE. `Object.fromEntries(formData)` turns
 * a file input into a `File`, and no Zod rule on it would mean anything: the
 * name, the size, and the declared type are all supplied by the client. Files
 * are checked in `src/lib/storage.ts`, against their actual bytes. These
 * schemas cover the text fields that travel alongside.
 */
export const projectImageFormSchema = z.object({
  slug: z.string().trim().min(1),
  // Required, unlike almost every other optional-looking field in this file.
  // An image on a project page carries content, and alt text that can be
  // skipped is alt text that is skipped.
  alt: z
    .string()
    .trim()
    .min(1, "Describe the image for someone who cannot see it")
    .max(300, "Keep alt text under 300 characters"),
  caption: optionalText,
});

export const projectImageEditSchema = z.object({
  id: z.string().min(1),
  alt: z
    .string()
    .trim()
    .min(1, "Describe the image for someone who cannot see it")
    .max(300, "Keep alt text under 300 characters"),
  caption: optionalText,
  sortOrder: z.coerce.number().int(),
});

export const resumeFormSchema = z.object({
  label: z.string().trim().min(1, "Required"),
  // Ends in .pdf and contains no path separators: this becomes the last
  // segment of the storage path, and therefore the filename a visitor's
  // browser saves. A slash here would silently create a folder instead.
  downloadName: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(/^[A-Za-z0-9._-]+\.pdf$/i, "A filename ending in .pdf, with no slashes or spaces"),
  revisedAt: z
    .string()
    .transform((value) => normalizeYearMonth(value))
    .refine((value) => value !== false && value !== null, "Required — e.g. 2026-04")
    .transform((value) => value as string),
  isCurrent: checkbox,
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export const profileFormSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  headline: z.string().trim().min(1, "Required"),
  shortBio: z.string().trim().min(1, "Required"),
  // One paragraph per blank-line-separated block, rendered in order.
  longBio: z
    .string()
    .transform((value) =>
      value
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0),
    )
    .refine((paragraphs) => paragraphs.length > 0, "At least one paragraph is required"),
  location: z.string().trim().min(1, "Required"),
  email: z.email("Must be a valid email address"),
  availability: optionalText,
});

/**
 * The public contact form — the only schema here parsing input from someone
 * who is not the admin.
 *
 * Lengths are capped on every field. Elsewhere in this file an unbounded
 * string is fine because the only person typing is the site's owner; here an
 * unbounded field is a free way to write megabytes into the database.
 */
export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120, "That name is too long"),
  email: z.email("Enter an email address so a reply can reach you").max(200),
  subject: optionalText.refine(
    (value) => value === null || value.length <= 160,
    "Keep the subject under 160 characters",
  ),
  message: z
    .string()
    .trim()
    .min(10, "A little more detail, please")
    .max(5000, "Please keep it under 5000 characters"),
});

/**
 * The hidden field name the honeypot uses.
 *
 * Named for something a form-filling bot wants to complete, and something no
 * person will ever see — it is hidden from sight AND from assistive
 * technology, so a screen-reader user cannot be tricked into failing it.
 * A human filling this in is impossible; a bot filling it in is routine.
 */
export const HONEYPOT_FIELD = "website";

/**
 * How quickly a submission is treated as automated.
 *
 * A speed bump, not a boundary. The timestamp is set in the browser and can
 * be forged by anything that bothers to look, so this only filters bots that
 * post the form the instant they parse it. The rate limit in
 * src/server/rate-limit.ts is the control that actually holds.
 */
export const MIN_FILL_MILLISECONDS = 3000;

/**
 * The shape a form action returns to `useActionState`.
 *
 * Declared here rather than beside the action because a `"use server"` module
 * may only export async functions — exporting a plain object from one fails
 * the build with "A 'use server' file can only export async functions".
 * Types are erased at compile time, so they are fine either way; the constant
 * is not.
 */
export type FormState = {
  error: string | null;
  fieldErrors: Record<string, string[]>;
  /** Set by actions that stay on the page instead of redirecting. */
  success?: boolean;
};

export const emptyFormState: FormState = { error: null, fieldErrors: {} };

/**
 * Flatten a Zod error into the `fieldErrors` shape `FormShell` reads.
 *
 * Lives here rather than beside the actions because a `"use server"` module
 * may only export async functions, and every actions file needs it. Nested
 * paths are joined with a dot; an issue with no path (a schema-level
 * `.refine`) is filed under "form".
 */
export function toFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

/** The standard "nothing was saved" response to a failed parse. */
export function invalidForm(error: Parameters<typeof toFieldErrors>[0]): FormState {
  return {
    error: "Please correct the highlighted fields.",
    fieldErrors: toFieldErrors(error),
  };
}

/** A single-field failure that did not come from Zod — an upload, say. */
export function fieldError(field: string, message: string): FormState {
  return { error: null, fieldErrors: { [field]: [message] } };
}
