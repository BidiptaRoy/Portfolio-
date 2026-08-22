import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";
import { getProjectSlugs } from "@/server/queries/projects";

/**
 * Generated from the query façade, so a project added through the CMS in
 * Phase 8 appears here automatically. A hand-maintained sitemap goes stale
 * the first time someone forgets to update it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const lastModified = new Date();

  const pages: { path: string; priority: number; changeFrequency: "monthly" | "yearly" }[] = [
    { path: "", priority: 1, changeFrequency: "monthly" },
    { path: "/projects", priority: 0.9, changeFrequency: "monthly" },
    { path: "/experience", priority: 0.8, changeFrequency: "monthly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    { path: "/resume", priority: 0.7, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  ];

  const slugs = await getProjectSlugs();

  return [
    ...pages.map((page) => ({
      url: `${base}${page.path}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...slugs.map((slug) => ({
      url: `${base}/projects/${slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
