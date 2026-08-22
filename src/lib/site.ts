/**
 * The canonical origin of the site, with no trailing slash.
 *
 * Resolution order, chosen so that no manual configuration is required for a
 * deployment to produce correct absolute URLs:
 *
 *   1. NEXT_PUBLIC_SITE_URL      — set this once a custom domain exists
 *   2. VERCEL_PROJECT_PRODUCTION_URL — injected by Vercel, always the
 *                                   production domain rather than the
 *                                   per-deployment preview URL, so preview
 *                                   builds do not emit canonical links
 *                                   pointing at themselves
 *   3. http://localhost:3000     — local development
 *
 * Getting this wrong is quietly expensive: Open Graph images and canonical
 * tags need absolute URLs, and a wrong origin means broken social previews
 * and search engines indexing preview deployments.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export const SITE_NAME = "Bidipta Roy";
export const SITE_TAGLINE = "Software engineer · Computer Science, Boston University";
