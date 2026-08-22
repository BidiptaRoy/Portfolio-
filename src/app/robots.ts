import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Listed for tidiness once /admin exists. This is NOT a security
      // control — robots.txt is advisory, publicly readable, and if anything
      // advertises the path. The admin area is protected by authentication;
      // see docs/decisions/0003.
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
