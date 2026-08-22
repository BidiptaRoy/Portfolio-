import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = { title: "About · Bidipta Roy" };

export default function AboutPage() {
  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="About"
        title="Background and approach"
        lead="Who I am, what I am working toward, and how I like to build software."
      />
      <p className="text-ink-muted mt-8">This section is being written.</p>
    </Container>
  );
}
