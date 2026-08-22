import { EducationForm } from "@/components/admin/education-form";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewEducationPage() {
  return (
    <Container className="py-12">
      <SectionHeading level={1} eyebrow="Education" title="New entry" />

      <div className="mt-8">
        <EducationForm />
      </div>
    </Container>
  );
}
