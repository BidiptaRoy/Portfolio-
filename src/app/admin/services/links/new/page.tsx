import { Container } from "@/components/layout/container";
import { ReferralLinkForm } from "@/components/admin/referral-link-form";
import { SectionHeading } from "@/components/ui/section-heading";

export default function NewReferralLinkPage() {
  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Referral"
        title="New referral link"
        lead="Saved as a draft by default. /r/[slug] only resolves once it is published."
      />

      <div className="mt-8">
        <ReferralLinkForm />
      </div>
    </Container>
  );
}
