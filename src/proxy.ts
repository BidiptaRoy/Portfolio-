import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Route protection, layer 1 of 3.
 *
 * ⚠ This file is `proxy.ts`, not `middleware.ts`. Next.js 16 deprecated and
 * renamed the middleware convention; a `middleware.ts` here would simply never
 * run. Nearly every Auth.js example still shows the old name.
 *
 * ⚠ THIS IS NOT THE SECURITY BOUNDARY. It runs before rendering and redirects
 * unauthenticated visitors away from /admin, which is a good experience — but
 * it is an optimization, not a guarantee:
 *
 *   - Next.js has shipped middleware-bypass vulnerabilities before.
 *   - A Server Action is a public POST endpoint that can be invoked directly,
 *     without a navigation that this file would ever see.
 *
 * So every admin page re-checks with `auth()`, and every Server Action
 * re-checks before touching anything. See docs/decisions/0003.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Scoped to /admin only. Running this on every request would put an auth
  // check in front of the public pages, which are static and should stay that
  // way. The login page is deliberately excluded — it must be reachable while
  // signed out.
  matcher: ["/admin/:path*"],
};
