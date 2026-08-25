import { Container } from "@/components/layout/container";
import { ServiceForm } from "@/components/admin/service-form";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewServicePage() {
  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Services"
        title="New service"
        lead="Saved as a draft by default. Nothing is public until you publish it."
      />

      <div className="mt-8">
        <ServiceForm />
      </div>
    </Container>
  );
}
