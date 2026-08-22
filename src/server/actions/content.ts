"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import {
  educationFormSchema,
  experienceFormSchema,
  profileFormSchema,
  skillFormSchema,
  type FormState,
} from "@/lib/validation/forms";

/**
 * Mutations for Experience, Education, Skills, and Profile.
 *
 * Same three steps as every action in this codebase, in the same order:
 *   1. requireAdmin()  — LAYER 3, before anything else
 *   2. Zod parse       — the payload can be anything
 *   3. mutate + revalidate
 *
 * Projects live in ./projects.ts. They are separate because projects have
 * their own routes and a much larger form; everything here shares one page.
 */

function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

const invalid = (error: Parameters<typeof toFieldErrors>[0]): FormState => ({
  error: "Please correct the highlighted fields.",
  fieldErrors: toFieldErrors(error),
});

/** Experience appears on the home page and its own page; both need clearing. */
function revalidateExperiencePaths() {
  revalidatePath("/");
  revalidatePath("/experience");
}

function revalidateAboutPaths() {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
}

// ── Experience ─────────────────────────────────────────────────────────────

export async function saveExperience(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = experienceFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const originalSlug = formData.get("originalSlug");
  const isEdit = typeof originalSlug === "string" && originalSlug.length > 0;

  const clash = await prisma.experience.findUnique({ where: { slug: parsed.data.slug } });
  if (clash && (!isEdit || clash.slug !== originalSlug)) {
    return { error: null, fieldErrors: { slug: ["An entry with this slug already exists."] } };
  }

  if (isEdit) {
    await prisma.experience.update({ where: { slug: originalSlug }, data: parsed.data });
  } else {
    await prisma.experience.create({ data: parsed.data });
  }

  revalidateExperiencePaths();
  redirect("/admin/experience");
}

export async function deleteExperience(slug: string) {
  await requireAdmin();
  await prisma.experience.delete({ where: { slug } });
  revalidateExperiencePaths();
  redirect("/admin/experience");
}

// ── Education ──────────────────────────────────────────────────────────────

export async function saveEducation(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = educationFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const originalSlug = formData.get("originalSlug");
  const isEdit = typeof originalSlug === "string" && originalSlug.length > 0;

  const clash = await prisma.education.findUnique({ where: { slug: parsed.data.slug } });
  if (clash && (!isEdit || clash.slug !== originalSlug)) {
    return { error: null, fieldErrors: { slug: ["An entry with this slug already exists."] } };
  }

  if (isEdit) {
    await prisma.education.update({ where: { slug: originalSlug }, data: parsed.data });
  } else {
    await prisma.education.create({ data: parsed.data });
  }

  revalidateAboutPaths();
  redirect("/admin/education");
}

export async function deleteEducation(slug: string) {
  await requireAdmin();
  await prisma.education.delete({ where: { slug } });
  revalidateAboutPaths();
  redirect("/admin/education");
}

// ── Skills ─────────────────────────────────────────────────────────────────

export async function saveSkill(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = skillFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  // Identified by id rather than name, so a skill can be renamed. See the
  // note on AdminSkill in src/server/queries/admin.ts.
  const originalId = formData.get("originalId");
  const isEdit = typeof originalId === "string" && originalId.length > 0;

  const clash = await prisma.skill.findUnique({ where: { name: parsed.data.name } });
  if (clash && (!isEdit || clash.id !== originalId)) {
    return { error: null, fieldErrors: { name: ["That skill already exists."] } };
  }

  if (isEdit) {
    await prisma.skill.update({ where: { id: originalId }, data: parsed.data });
  } else {
    await prisma.skill.create({ data: parsed.data });
  }

  revalidateAboutPaths();
  redirect("/admin/skills");
}

export async function deleteSkill(id: string) {
  await requireAdmin();
  await prisma.skill.delete({ where: { id } });
  revalidateAboutPaths();
  redirect("/admin/skills");
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = profileFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  // Singleton: upsert so a missing row self-heals rather than throwing.
  await prisma.profile.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  revalidateAboutPaths();

  // No redirect — there is nowhere better to go from a singleton editor. The
  // success flag is what tells the user anything happened at all.
  return { error: null, fieldErrors: {}, success: true };
}
