import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Route protection, layer 2 of 3.
 *
 * `src/proxy.ts` already redirects unauthenticated requests, so in normal
 * operation this check never fires. It exists precisely because the proxy
 * cannot be relied on as a boundary — see docs/decisions/0003. A duplicated
 * check that costs one cached call is a good trade against a bypass.
 *
 * Layer 3 lives inside every Server Action, and is the one that actually
 * matters: an action can be invoked without ever rendering this layout.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-line bg-surface-sunken border-b">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-col">
            <span className="text-ink font-serif text-lg">Admin</span>
            <span className="text-ink-muted text-xs">{session.user.email}</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-ink-muted hover:text-accent text-sm transition-colors">
              View site ↗
            </Link>

            <form action={logout}>
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </Container>

        <Container className="border-line border-t py-2">
          <AdminNav />
        </Container>
      </header>

      {children}
    </div>
  );
}
