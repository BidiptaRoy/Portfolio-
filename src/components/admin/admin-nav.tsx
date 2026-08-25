"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Admin section navigation.
 *
 * `ready: false` renders a section as disabled, so the shape of the finished
 * CMS stays visible while it is being built. Nothing is disabled today.
 */
const sections = [
  { href: "/admin", label: "Dashboard", ready: true },
  { href: "/admin/projects", label: "Projects", ready: true },
  { href: "/admin/experience", label: "Experience", ready: true },
  { href: "/admin/education", label: "Education", ready: true },
  { href: "/admin/skills", label: "Skills", ready: true },
  { href: "/admin/resume", label: "Resume", ready: true },
  { href: "/admin/profile", label: "Profile", ready: true },
  { href: "/admin/messages", label: "Messages", ready: true },
  // Services IS in the admin nav, unlike the public one. The reason services
  // are hidden from the public nav is about which audience sees what; there is
  // one admin, and hiding a section from yourself is just a section you forget
  // to update.
  { href: "/admin/services", label: "Services", ready: true },
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
                  title="Not built yet"
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
