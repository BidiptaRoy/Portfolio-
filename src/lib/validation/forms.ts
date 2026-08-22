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

const YEAR_MONTH = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

const optionalYearMonth = optionalText.refine(
  (value) => value === null || YEAR_MONTH.test(value),
  "Expected a year (2025) or a year and month (2025-11)",
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
