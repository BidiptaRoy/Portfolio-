"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { projectFormSchema, type FormState } from "@/lib/validation/forms";

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

/**
 * Public pages are prerendered, so a database write is invisible until the
 * affected paths are invalidated. Missing one here is the classic "I saved it
 * and the site still shows the old version" bug.
 */
function revalidateProjectPaths() {
  revalidatePath("/"); // featured projects on the home page
  revalidatePath("/projects"); // the index and its filters
  revalidatePath("/projects/[slug]", "page"); // every detail page
  revalidatePath("/sitemap.xml"); // slugs are listed there
}

function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

export async function saveProject(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = projectFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

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

  await prisma.project.delete({ where: { slug } });
  revalidateProjectPaths();
  redirect("/admin/projects");
}
