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
    <nav
      aria-label="Primary"
      className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0"
    >
      <ul className="flex items-center gap-5 whitespace-nowrap sm:gap-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative block py-1 text-sm transition-colors",
                  isActive ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
                {/* Static accent rule marking the current section. */}
                <span
                  aria-hidden
                  className={cn(
                    "bg-accent absolute inset-x-0 -bottom-0.5 h-0.5",
                    isActive ? "block" : "hidden",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
