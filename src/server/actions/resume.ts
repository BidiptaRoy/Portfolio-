"use server";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { deleteFile, uploadFile } from "@/lib/storage";
import { fieldError, invalidForm, resumeFormSchema, type FormState } from "@/lib/validation/forms";
import { revalidateResumePaths } from "@/server/revalidate";

/**
 * Resume mutations.
 *
 * A resume is versioned rather than overwritten: uploading a corrected PDF
 * adds a revision, and the old one stays until it is deleted deliberately.
 * That is what makes `status` useful here — a revision can be prepared,
 * checked on the admin, and published only when it is right. The typo in the
 * currently published contact email is exactly the case this is for.
 */

/**
 * Blob stores the file under its pathname, and a browser saves a downloaded
 * file under the LAST SEGMENT of that path. So the filename must be clean —
 * `Bidipta-Roy-Resume.pdf`, not `Bidipta-Roy-Resume-9fK2p.pdf` — which rules
 * out a random suffix. Uniqueness comes from a timestamped folder instead,
 * so every revision keeps its own URL and none overwrites another.
 */
function resumePathname(downloadName: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");
  return `resume/${stamp}/${downloadName}`;
}

export async function uploadResumeVersion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = resumeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error);

  const { label, downloadName, revisedAt, status, isCurrent } = parsed.data;
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return fieldError("file", "Choose a PDF to upload.");
  }

  const uploaded = await uploadFile({
    file,
    kind: "document",
    pathname: resumePathname(downloadName),
    unique: false,
  });

  if (!uploaded.ok) return fieldError("file", uploaded.message);

  // One transaction, because "mark this one current" and "unmark the others"
  // are the same edit. Two statements could leave two current resumes, and
  // the public query would then pick one by sort order — silently serving a
  // revision nobody chose.
  await prisma.$transaction(async (tx) => {
    if (isCurrent) {
      await tx.resumeVersion.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }

    await tx.resumeVersion.create({
      data: {
        label,
        fileUrl: uploaded.url,
        downloadUrl: uploaded.downloadUrl,
        pathname: uploaded.pathname,
        downloadName,
        revisedAt,
        isCurrent,
        status,
        sortOrder: 0,
      },
    });
  });

  revalidateResumePaths();

  return { error: null, fieldErrors: {}, success: true };
}

export async function setResumeStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  await requireAdmin();

  await prisma.resumeVersion.update({ where: { id }, data: { status } });
  revalidateResumePaths();
}

export async function setCurrentResume(id: string) {
  await requireAdmin();

  await prisma.$transaction([
    prisma.resumeVersion.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
    prisma.resumeVersion.update({ where: { id }, data: { isCurrent: true } }),
  ]);

  revalidateResumePaths();
}

export async function deleteResumeVersion(id: string) {
  await requireAdmin();

  const version = await prisma.resumeVersion.findUnique({
    where: { id },
    select: { fileUrl: true, pathname: true },
  });

  await prisma.resumeVersion.delete({ where: { id } });

  // Only files this app uploaded are deleted. A `pathname` of null means the
  // row points at something under /public that is committed to the repository
  // — deleting the row must not try to reach into the deployment for it.
  if (version?.pathname) await deleteFile(version.fileUrl);

  revalidateResumePaths();
}
