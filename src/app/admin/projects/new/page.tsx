import { Container } from "@/components/layout/container";
import { ProjectForm } from "@/components/admin/project-form";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewProjectPage() {
  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Projects"
        title="New project"
        lead="Saved as a draft by default. Nothing is public until you publish it."
      />

      <div className="mt-8">
        <ProjectForm />
      </div>
    </Container>
  );
}
