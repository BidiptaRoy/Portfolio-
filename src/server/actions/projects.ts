"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { invalidForm, projectFormSchema, type FormState } from "@/lib/validation/forms";
import { revalidateProjectPaths } from "@/server/revalidate";

/**
 * Project mutations.
 *
 * Every action follows the same three steps, in this order, without exception:
 *
 *   1. requireAdmin()   — LAYER 3. Before anything else. A Server Action is a
 *                         public POST endpoint; the proxy never sees it.
 *   2. Zod parse        — the browser's validation is a convenience, not a
 *                         guarantee. The payload can be anything.
 *   3. mutate + revalidate
 *
 * If you add an action here and it does not start with requireAdmin(), it is
 * an unauthenticated write endpoint. See docs/decisions/0003.
 */

export async function saveProject(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = projectFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return invalidForm(parsed.error);

  const data = parsed.data;

  // `originalSlug` is present when editing. Its absence means "create".
  const originalSlug = formData.get("originalSlug");
  const isEdit = typeof originalSlug === "string" && originalSlug.length > 0;

  // Renaming a slug changes a public URL, so guard against silently
  // overwriting a different project that already owns the new one.
  const clash = await prisma.project.findUnique({ where: { slug: data.slug } });
  if (clash && (!isEdit || clash.slug !== originalSlug)) {
    return {
      error: null,
      fieldErrors: { slug: ["A project with this slug already exists."] },
    };
  }

  if (isEdit) {
    await prisma.project.update({ where: { slug: originalSlug }, data });
  } else {
    await prisma.project.create({ data });
  }

  revalidateProjectPaths();

  // redirect() throws NEXT_REDIRECT, so it must be outside the try/catch of
  // any caller. Nothing runs after this line.
  redirect("/admin/projects");
}

export async function setProjectStatus(slug: string, status: "DRAFT" | "PUBLISHED") {
  await requireAdmin();

  await prisma.project.update({ where: { slug }, data: { status } });
  revalidateProjectPaths();
}

export async function deleteProject(slug: string) {
  await requireAdmin();

  // Image ROWS are removed by the cascade on the foreign key; the stored
  // FILES are not, and nothing else would ever reference them again. Collect
  // their locations before the delete, because afterwards there is no way
  // left to find them.
  const images = await prisma.projectImage.findMany({
    where: { project: { slug } },
    select: { url: true },
  });

  await prisma.project.delete({ where: { slug } });

  // Best effort, and after the row is gone: an orphaned file costs a fraction
  // of a cent, while a storage error here would fail an already-completed
  // delete and leave the admin looking at an error for work that succeeded.
  await Promise.all(images.map((image) => deleteFile(image.url)));

  revalidateProjectPaths();
  redirect("/admin/projects");
}
