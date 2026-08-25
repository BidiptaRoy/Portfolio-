import { notFound } from "next/navigation";

import { ReferralLinkForm } from "@/components/admin/referral-link-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { deleteReferralLink } from "@/server/actions/services";
import { getReferralLinkForAdmin } from "@/server/queries/admin";

export default async function EditReferralLinkPage({
  params,
}: PageProps<"/admin/services/links/[slug]">) {
  const { slug } = await params;
  const link = await getReferralLinkForAdmin(slug);

  if (!link) notFound();

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Referral"
        title={link.label}
        lead={`Currently sends /r/${link.slug} to ${link.url}`}
      />

      <div className="mt-8">
        <ReferralLinkForm link={link} />
      </div>

      <div className="border-line mt-12 border-t pt-6">
        <h2 className="text-ink font-serif text-lg">Delete</h2>
        <p className="text-ink-muted mt-1 max-w-prose text-sm">
          Permanent, and <code>/r/{link.slug}</code> stops resolving for anyone who saved or shared
          it. <strong>Retiring is almost always the better option</strong> — it keeps the slug
          working and sends people to the services page instead of a dead link.
        </p>

        <form
          action={async () => {
            "use server";
            await deleteReferralLink(link.slug);
          }}
          className="mt-4"
        >
          <Button type="submit" variant="secondary" size="sm">
            Delete this link
          </Button>
        </form>
      </div>
    </Container>
  );
}
