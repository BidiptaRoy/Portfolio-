import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = { title: "Experience · Bidipta Roy" };

export default function ExperiencePage() {
  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Experience"
        title="Technical and professional work"
        lead="Engineering work alongside independent, client-facing professional services."
      />
      <p className="text-ink-muted mt-8">This section is being written.</p>
    </Container>
  );
}
