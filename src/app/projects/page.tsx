import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = { title: "Projects · Bidipta Roy" };

export default function ProjectsPage() {
  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Projects"
        title="Selected work"
        lead="What I built, the decisions behind it, and what came out of it."
      />
      <p className="text-ink-muted mt-8">This section is being written.</p>
    </Container>
  );
}
