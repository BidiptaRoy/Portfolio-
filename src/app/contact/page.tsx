import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = { title: "Contact · Bidipta Roy" };

export default function ContactPage() {
  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Contact"
        title="Get in touch"
        lead="For roles, collaboration, or professional services."
      />
      <p className="text-ink-muted mt-8">This section is being written.</p>
    </Container>
  );
}
