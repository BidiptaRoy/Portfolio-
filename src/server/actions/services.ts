"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import {
  invalidForm,
  referralLinkFormSchema,
  serviceFormSchema,
  type FormState,
} from "@/lib/validation/forms";
import { revalidateServicePaths } from "@/server/revalidate";

/**
 * Mutations for the services area — Phase 12.
 *
 * Same three steps as every action in this codebase, in the same order:
 *   1. requireAdmin()  — LAYER 3, before anything else
 *   2. Zod parse       — the payload can be anything
 *   3. mutate + revalidate
 *
 * ⚠ Every export in this file is guarded. There are exactly three unguarded
 * actions in the codebase — `login`, `logout`, and `submitContactMessage` —
 * and a fourth is a bug. Re-run the audit in docs/roadmap.md after touching
 * anything here.
 */

// ── Services ───────────────────────────────────────────────────────────────

export async function saveService(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = serviceFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error);

  const originalSlug = formData.get("originalSlug");
  const isEdit = typeof originalSlug === "string" && originalSlug.length > 0;

  // Slug collisions are caught here rather than left to the unique constraint,
  // so the form can point at the field instead of the save failing with a
  // database error the person cannot act on.
  const clash = await prisma.service.findUnique({ where: { slug: parsed.data.slug } });
  if (clash && (!isEdit || clash.slug !== originalSlug)) {
    return { error: null, fieldErrors: { slug: ["A service with this slug already exists."] } };
  }

  if (isEdit) {
    await prisma.service.update({ where: { slug: originalSlug }, data: parsed.data });
  } else {
    await prisma.service.create({ data: parsed.data });
  }

  revalidateServicePaths();
  redirect("/admin/services");
}

export async function deleteService(slug: string) {
  await requireAdmin();
  await prisma.service.delete({ where: { slug } });
  revalidateServicePaths();
  redirect("/admin/services");
}

export async function setServiceStatus(slug: string, status: "DRAFT" | "PUBLISHED") {
  await requireAdmin();
  await prisma.service.update({ where: { slug }, data: { status } });
  revalidateServicePaths();
}

// ── Referral links ─────────────────────────────────────────────────────────

export async function saveReferralLink(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = referralLinkFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error);

  const originalSlug = formData.get("originalSlug");
  const isEdit = typeof originalSlug === "string" && originalSlug.length > 0;

  const clash = await prisma.referralLink.findUnique({ where: { slug: parsed.data.slug } });
  if (clash && (!isEdit || clash.slug !== originalSlug)) {
    return { error: null, fieldErrors: { slug: ["A link with this slug already exists."] } };
  }

  if (isEdit) {
    await prisma.referralLink.update({ where: { slug: originalSlug }, data: parsed.data });
  } else {
    await prisma.referralLink.create({ data: parsed.data });
  }

  revalidateServicePaths();
  redirect("/admin/services");
}

export async function deleteReferralLink(slug: string) {
  await requireAdmin();
  await prisma.referralLink.delete({ where: { slug } });
  revalidateServicePaths();
  redirect("/admin/services");
}

/**
 * Retiring a referral link is an unpublish, not a delete.
 *
 * The slug stays reachable at `/r/[slug]`, where it now redirects to
 * `/services` instead of an expired offer — which is the right destination for
 * someone who followed an old promo code. Deleting the row would work too, but
 * it discards the record of a code that was in circulation.
 */
export async function setReferralLinkStatus(slug: string, status: "DRAFT" | "PUBLISHED") {
  await requireAdmin();
  await prisma.referralLink.update({ where: { slug }, data: { status } });
  revalidateServicePaths();
}
