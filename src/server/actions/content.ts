"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { deleteFile, uploadFile } from "@/lib/storage";
import {
  educationFormSchema,
  experienceFormSchema,
  fieldError,
  invalidForm,
  profileFormSchema,
  skillFormSchema,
  type FormState,
} from "@/lib/validation/forms";
import { revalidateAboutPaths, revalidateExperiencePaths } from "@/server/revalidate";

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

// ── Experience ─────────────────────────────────────────────────────────────

export async function saveExperience(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = experienceFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error);

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
  if (!parsed.success) return invalidForm(parsed.error);

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
  if (!parsed.success) return invalidForm(parsed.error);

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
  if (!parsed.success) return invalidForm(parsed.error);

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

// ── Profile photo ──────────────────────────────────────────────────────────
//
// Kept out of `saveProfile` on purpose. Bundling a file input into that form
// would re-upload the portrait on every text edit, and a failed upload would
// then reject a save that had nothing to do with the photo.

export async function uploadProfilePhoto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fieldError("file", "Choose an image to upload.");
  }

  const uploaded = await uploadFile({ file, kind: "image", pathname: `profile/${file.name}` });
  if (!uploaded.ok) return fieldError("file", uploaded.message);

  const previous = await prisma.profile.findUnique({
    where: { id: "singleton" },
    select: { photoUrl: true, photoPathname: true },
  });

  await prisma.profile.update({
    where: { id: "singleton" },
    data: { photoUrl: uploaded.url, photoPathname: uploaded.pathname },
  });

  // Replacing a photo makes the old file unreachable, so it goes — but only
  // after the row points at the new one. The order matters: the reverse would
  // leave a window where the hero references a file that no longer exists.
  if (previous?.photoUrl && previous.photoPathname) await deleteFile(previous.photoUrl);

  revalidateAboutPaths();

  return { error: null, fieldErrors: {}, success: true };
}

export async function removeProfilePhoto() {
  await requireAdmin();

  const previous = await prisma.profile.findUnique({
    where: { id: "singleton" },
    select: { photoUrl: true, photoPathname: true },
  });

  await prisma.profile.update({
    where: { id: "singleton" },
    data: { photoUrl: null, photoPathname: null },
  });

  if (previous?.photoUrl && previous.photoPathname) await deleteFile(previous.photoUrl);

  revalidateAboutPaths();
}
