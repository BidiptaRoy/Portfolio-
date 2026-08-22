import type { NextAuthConfig } from "next-auth";

/**
 * The EDGE-SAFE half of the auth configuration.
 *
 * `src/proxy.ts` runs on the Edge runtime, where there is no Node API surface:
 * Prisma and the argon2 native module cannot load there. So this file holds
 * only what the proxy needs — route rules and page paths — and carries no
 * providers, no database access, and no hashing.
 *
 * The full configuration, including the Credentials provider, lives in
 * `src/auth.ts` and runs in the Node runtime. Merging the two into one file is
 * the most common way an Auth.js + Prisma setup breaks at deploy time rather
 * than locally.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },

  // Populated in src/auth.ts. An empty array here is intentional: the proxy
  // only ever reads the session cookie, it never authenticates anyone.
  providers: [],

  callbacks: {
    /**
     * First of three enforcement layers, and the weakest of them.
     *
     * This is a convenience so unauthenticated visitors get a redirect instead
     * of a flash of the admin shell. It is NOT the security boundary — see
     * docs/decisions/0003. Pages re-check with `auth()`, and every Server
     * Action re-checks before doing anything.
     */
    authorized({ auth, request }) {
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
      if (!isAdminRoute) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
