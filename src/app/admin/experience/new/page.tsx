import { ExperienceForm } from "@/components/admin/experience-form";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewExperiencePage() {
  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Experience"
        title="New entry"
        lead="Saved as a draft by default. Nothing is public until you publish it."
      />

      <div className="mt-8">
        <ExperienceForm />
      </div>
    </Container>
  );
}
