import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = { title: "Resume · Bidipta Roy" };

export default function ResumePage() {
  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Resume"
        title="Resume"
        lead="A current copy, available to read here or download."
      />
      <p className="text-ink-muted mt-8">This section is being written.</p>
    </Container>
  );
}
