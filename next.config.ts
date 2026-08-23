import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
