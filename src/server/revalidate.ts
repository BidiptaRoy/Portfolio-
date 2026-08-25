import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Which paths each kind of edit invalidates.
 *
 * Public pages are prerendered, so a database write is invisible until the
 * pages built from it are cleared. Missing one is the single most common
 * Next.js complaint — "I saved it and the site still shows the old version".
 *
 * Centralised because more than one action file now writes the same content:
 * a project's fields are edited in `actions/projects.ts` and its images in
 * `actions/project-images.ts`, and both must clear the same set. Two copies
 * of this list drift, and the drift is silent — the save succeeds, the page
 * just never updates.
 *
 * These are plain functions in a plain module. `"use server"` files may only
 * export async functions, so this cannot live beside the actions that call it.
 */

export function revalidateProjectPaths() {
  revalidatePath("/"); // featured projects on the home page
  revalidatePath("/projects"); // the index and its filters
  revalidatePath("/projects/[slug]", "page"); // every detail page
  revalidatePath("/sitemap.xml"); // slugs are listed there
}

/** Experience appears on the home page and its own page; both need clearing. */
export function revalidateExperiencePaths() {
  revalidatePath("/");
  revalidatePath("/experience");
}

export function revalidateAboutPaths() {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
}

/**
 * The services area.
 *
 * `/about` is in the list because it links to `/services`, and `/sitemap.xml`
 * because the page is listed there — the sitemap is how a prospective client
 * finds this page at all, given it is deliberately absent from the main nav.
 *
 * `/r/[slug]` is NOT here and needs no entry: it is `force-dynamic`, so it
 * reads the database on every request and has nothing cached to invalidate.
 */
export function revalidateServicePaths() {
  revalidatePath("/services");
  revalidatePath("/about");
  revalidatePath("/sitemap.xml");
}

/** The resume is offered on its own page and linked from the home page. */
export function revalidateResumePaths() {
  revalidatePath("/");
  revalidatePath("/resume");
}
