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
};

export const emptyFormState: FormState = { error: null, fieldErrors: {} };
