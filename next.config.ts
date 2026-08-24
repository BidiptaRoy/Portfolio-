import type { NextConfig } from "next";

// A relative path, not the `@/` alias: this file is evaluated outside the
// app's module graph, where that alias does not exist.
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  /**
   * Security headers on every response, including static assets.
   *
   * Set here rather than in `src/proxy.ts` because the proxy is scoped to
   * `/admin` — deliberately, so that an auth check never runs in front of
   * the public pages. Headers belong on everything, so they go in the
   * config, which Vercel applies at the edge without invoking a function.
   *
   * The policy itself, and why it is not nonce-based, is in
   * `src/lib/security-headers.ts`.
   */
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders() }];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Vercel Blob serves each store from its own subdomain, and the store
        // id is not known until the store is created — hence the wildcard.
        // It is still narrow: only Blob stores, only https, and `search: ""`
        // blocks query strings so the optimizer cannot be pointed at
        // arbitrary URLs with a crafted parameter.
        hostname: "**.public.blob.vercel-storage.com",
        port: "",
        search: "",
      },
    ],
  },
  experimental: {
    // Uploads travel through a Server Action, and the default cap is 1 MB —
    // small enough that a normal screenshot fails. Kept in step with
    // MAX_UPLOAD_BYTES in src/lib/storage.ts, which is set slightly lower so
    // an oversized file fails with our message rather than a platform 413.
    //
    // 4.5 MB is the ceiling that matters: Vercel caps a serverless request
    // body there and it is not configurable. Larger files would need
    // client-side upload, which sends the bytes straight to Blob instead.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
