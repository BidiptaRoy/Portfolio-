import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * LAYER 3 — the actual security boundary.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Call this as the FIRST statement of every Server Action and every admin
 * query. Before parsing input, before touching the database, before anything.
 *
 * Why it is not redundant with `src/proxy.ts`:
 *
 *   A Server Action compiles to a public HTTP POST endpoint with a generated
 *   ID. Anyone who has that ID can invoke it directly with curl — no page
 *   render, no navigation, and therefore nothing the proxy ever observes.
 *   The proxy only sees requests for pages.
 *
 * So the proxy is a redirect for humans, and this is the thing that actually
 * stops an unauthenticated write. If you are adding an action and wondering
 * whether you can skip this because "/admin is already protected" — you
 * cannot. See docs/decisions/0003.
 *
 * Redirects rather than throwing: a legitimate admin whose 8-hour session
 * expired mid-edit lands on the login page instead of a 500. An attacker is
 * stopped either way, since the redirect happens before any mutation.
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session.user;
}
