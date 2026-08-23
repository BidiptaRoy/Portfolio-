"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/**
 * Reading and clearing the contact inbox. Admin only.
 *
 * Deliberately a separate file from ./contact.ts. That one holds the single
 * public write in this codebase; keeping guarded and unguarded actions apart
 * means the dangerous file is short enough to read in full, and an action
 * added to the wrong one looks wrong. Same reasoning as
 * src/server/queries/admin.ts.
 */

/** Only the inbox renders messages, so only the inbox needs clearing. */
function revalidateInbox() {
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function setMessageRead(id: string, read: boolean) {
  await requireAdmin();

  await prisma.contactMessage.update({ where: { id }, data: { read } });
  revalidateInbox();
}

export async function deleteMessage(id: string) {
  await requireAdmin();

  await prisma.contactMessage.delete({ where: { id } });
  revalidateInbox();
}
