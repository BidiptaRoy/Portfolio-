import Link from "next/link";

import { Container } from "@/components/layout/container";
import { navItems } from "@/lib/navigation";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-line bg-surface-sunken mt-20 border-t">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-ink font-serif text-base">Bidipta Roy</span>
          <span className="text-ink-muted text-sm">Computer Science · Boston University</span>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-ink-muted hover:text-accent text-sm transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/*
              Services is appended here rather than added to `navItems`, and
              that is deliberate: it must NOT appear in the header. The main
              nav is optimized for recruiters, and the footer is where the
              client-facing area is reachable without putting it in front of
              an audience it is not for. See docs/decisions/0013 — including
              the trigger that would promote it into the header.
            */}
            <li>
              <Link
                href="/services"
                className="text-ink-muted hover:text-accent text-sm transition-colors"
              >
                Services
              </Link>
            </li>
          </ul>
        </nav>
      </Container>

      <Container className="border-line border-t py-5">
        <p className="text-ink-muted text-xs">© {year} Bidipta Roy</p>
      </Container>
    </footer>
  );
}
