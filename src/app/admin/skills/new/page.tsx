import { SkillForm } from "@/components/admin/skill-form";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewSkillPage() {
  return (
    <Container width="narrow" className="py-12">
      <SectionHeading level={1} eyebrow="Skills" title="Add skill" />

      <div className="mt-8">
        <SkillForm />
      </div>
    </Container>
  );
}
