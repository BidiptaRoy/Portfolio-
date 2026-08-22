import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { ExperienceEntry } from "@/components/portfolio/experience-entry";
import { SectionHeading } from "@/components/ui/section-heading";
import { getExperienceBySection } from "@/server/queries/experience";

export const metadata: Metadata = {
  title: "Experience · Bidipta Roy",
  description:
    "Technical work, professional roles, and leadership positions held at Boston University and beyond.",
};

export default async function ExperiencePage() {
  const { technical, professional, leadership } = await getExperienceBySection();

  // Sections are declared as data so an empty one is skipped entirely rather
  // than rendering a heading with nothing under it. An empty section signals
  // absence louder than omitting it.
  const sections = [
    {
      key: "technical",
      eyebrow: "Technical",
      title: "Technical experience",
      entries: technical,
    },
    {
      key: "professional",
      eyebrow: "Professional",
      title: "Professional experience",
      entries: professional,
    },
    {
      key: "leadership",
      eyebrow: "Leadership",
      title: "Activities and leadership",
      entries: leadership,
    },
  ].filter((section) => section.entries.length > 0);

  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Experience"
        title="Where I've worked"
        lead="Engineering work alongside client-facing professional services and elected leadership roles."
      />

      <div className="mt-12 flex flex-col gap-14">
        {sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-4">
            <SectionHeading eyebrow={section.eyebrow} title={section.title} />

            <div>
              {section.entries.map((entry) => (
                <ExperienceEntry key={entry.slug} entry={entry} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
