"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Admin section navigation. Entities beyond Projects arrive in the second
 * half of Phase 8; they are listed as disabled so the shape of the finished
 * CMS is visible rather than implied.
 */
const sections = [
  { href: "/admin", label: "Dashboard", ready: true },
  { href: "/admin/projects", label: "Projects", ready: true },
  { href: "/admin/experience", label: "Experience", ready: false },
  { href: "/admin/education", label: "Education", ready: false },
  { href: "/admin/skills", label: "Skills", ready: false },
  { href: "/admin/profile", label: "Profile", ready: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {sections.map((section) => {
          const isActive =
            section.href === "/admin" ? pathname === "/admin" : pathname.startsWith(section.href);

          if (!section.ready) {
            return (
              <li key={section.href}>
                <span
                  className="text-ink-muted/60 flex min-h-11 items-center text-sm sm:min-h-0 sm:py-1"
                  title="Coming in the next part of Phase 8"
                >
                  {section.label}
                </span>
              </li>
            );
          }

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center text-sm transition-colors sm:min-h-0 sm:py-1",
                  isActive ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                <span className="relative">
                  {section.label}
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
