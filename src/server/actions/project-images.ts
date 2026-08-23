"use server";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { deleteFile, readImageDimensions, uploadFile } from "@/lib/storage";
import {
  fieldError,
  invalidForm,
  projectImageEditSchema,
  projectImageFormSchema,
  type FormState,
} from "@/lib/validation/forms";
import { revalidateProjectPaths } from "@/server/revalidate";

/**
 * Project gallery mutations.
 *
 * The same order as every action in this codebase — requireAdmin(), Zod
 * parse, mutate, revalidate — with one addition specific to uploads:
 *
 *   THE FILE IS STORED BEFORE THE ROW IS WRITTEN, AND ONLY IF THAT SUCCEEDS.
 *
 * The two can disagree in two ways, and they are not equally bad. A stored
 * file with no row is an orphan costing a fraction of a cent, invisible to
 * everyone. A row with no file is a broken image on a public page. So the
 * upload goes first and a failed row write leaves an orphan on purpose.
 */

export async function uploadProjectImage(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = projectImageFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error);

  const { slug, alt, caption } = parsed.data;
  const file = formData.get("file");

  // FormData gives back a string for a text field and a File for a file
  // input — but the payload is attacker-controlled, so the type is checked
  // rather than assumed.
  if (!(file instanceof File)) {
    return fieldError("file", "Choose an image to upload.");
  }

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return fieldError("file", "That project no longer exists.");

  const uploaded = await uploadFile({
    file,
    kind: "image",
    pathname: `projects/${slug}/${file.name}`,
  });
  if (!uploaded.ok) return fieldError("file", uploaded.message);

  // Read from the file rather than the stored blob: the bytes are already in
  // hand, and a failed read must not fail the upload.
  const dimensions = await readImageDimensions(file);

  // Append to the end of the gallery. Ordering is edited afterwards, so a new
  // image never displaces one already positioned.
  const last = await prisma.projectImage.findFirst({
    where: { projectId: project.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.projectImage.create({
    data: {
      projectId: project.id,
      url: uploaded.url,
      pathname: uploaded.pathname,
      alt,
      caption,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  revalidateProjectPaths();

  // Stays on the page — uploading images is a repeated action, and being
  // redirected away after each one would make adding five a chore.
  return { error: null, fieldErrors: {}, success: true };
}

export async function updateProjectImage(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = projectImageEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error);

  const { id, alt, caption, sortOrder } = parsed.data;

  await prisma.projectImage.update({ where: { id }, data: { alt, caption, sortOrder } });
  revalidateProjectPaths();

  return { error: null, fieldErrors: {}, success: true };
}

export async function deleteProjectImage(id: string) {
  await requireAdmin();

  // Read the location before the row is gone, or the file can never be found.
  const image = await prisma.projectImage.findUnique({
    where: { id },
    select: { url: true },
  });

  await prisma.projectImage.delete({ where: { id } });

  // After the row, and never allowed to throw: the image is already off the
  // site at this point, and a storage hiccup must not turn a completed delete
  // into an error page.
  if (image) await deleteFile(image.url);

  revalidateProjectPaths();
}
