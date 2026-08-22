"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * The only client component in the layout shell — it needs `usePathname` to
 * mark the current section. Kept deliberately small so the rest of the header
 * stays a Server Component.
 *
 * No hamburger menu: five short labels fit on one row, and on narrow screens
 * the row scrolls horizontally. That avoids a toggle, its open/close state, and
 * the focus-trapping work a real mobile menu would need — none of which earns
 * its keep for five links.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="min-w-0">
      {/* Wraps rather than scrolls horizontally. A scrolling row hides links
          off-screen with no affordance that they exist; two short rows on a
          narrow phone is worse-looking and better-working. */}
      <ul className="flex flex-wrap items-center gap-x-5 sm:gap-x-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // min-h-11 is 44px — Apple's minimum comfortable touch target.
                  // Relaxed back to a tight row once there is a pointer.
                  "flex min-h-11 items-center text-sm transition-colors sm:min-h-0 sm:py-1",
                  isActive ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {/* The underline hugs the text, not the enlarged tap target. */}
                <span className="relative">
                  {item.label}
                  <span
                    aria-hidden
                    className={cn(
                      "bg-accent absolute inset-x-0 -bottom-1.5 h-0.5",
                      isActive ? "block" : "hidden",
                    )}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
