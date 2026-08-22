import Link from "next/link";

import { Container } from "@/components/layout/container";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteHeader() {
  return (
    <header className="border-line bg-page border-b">
      <Container className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <Link
          href="/"
          className="text-ink hover:text-accent flex min-h-11 shrink-0 items-center font-serif text-lg tracking-tight transition-colors sm:min-h-0"
        >
          Bidipta Roy
        </Link>

        <SiteNav />
      </Container>
    </header>
  );
}
