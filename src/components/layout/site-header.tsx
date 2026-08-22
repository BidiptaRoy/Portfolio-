import Link from "next/link";

import { Container } from "@/components/layout/container";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteHeader() {
  return (
    <header className="border-line bg-page border-b">
      <Container className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <Link
          href="/"
          className="text-ink hover:text-accent font-serif text-lg tracking-tight transition-colors"
        >
          Bidipta Roy
        </Link>

        <SiteNav />
      </Container>
    </header>
  );
}
