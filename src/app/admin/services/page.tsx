import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { setReferralLinkStatus, setServiceStatus } from "@/server/actions/services";
import { getReferralLinksForAdmin, getServicesForAdmin } from "@/server/queries/admin";

/**
 * Services and referral links on one page.
 *
 * Together rather than as two sections of the admin nav: there are three
 * services and one referral link, and the link is only meaningful in the
 * context of the services it books. Splitting them would add a nav entry to
 * manage a single row.
 */
export default async function AdminServicesPage() {
  // Both include drafts — these are the admin queries, not the public façade.
  const [services, referrals] = await Promise.all([
    getServicesForAdmin(),
    getReferralLinksForAdmin(),
  ]);

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          level={1}
          eyebrow="Services"
          title="Services"
          lead="The client-facing area. Not linked from the main nav — see docs/decisions/0013."
          className="flex-1"
        />
        <Link href="/admin/services/new" className={buttonStyles()}>
          New service
        </Link>
      </div>

      <ul className="mt-8 flex flex-col">
        {services.map((service) => (
          <li
            key={service.slug}
            className="border-line flex flex-wrap items-start justify-between gap-4 border-t py-4"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/services/${service.slug}`}
                  className="text-ink hover:text-accent font-serif text-lg transition-colors"
                >
                  {service.name}
                </Link>

                {service.status === "DRAFT" ? <Badge>Draft</Badge> : null}
              </div>

              <p className="text-ink-muted text-sm">
                {service.summary}
                {` · order ${service.sortOrder}`}
              </p>
            </div>

            <form
              action={async () => {
                "use server";
                await setServiceStatus(
                  service.slug,
                  service.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                );
              }}
            >
              <Button type="submit" variant="secondary" size="sm">
                {service.status === "PUBLISHED" ? "Unpublish" : "Publish"}
              </Button>
            </form>
          </li>
        ))}
      </ul>

      {services.length === 0 ? (
        <p className="text-ink-muted mt-8 text-sm">
          No services yet. Create one — the public page shows a short fallback until then.
        </p>
      ) : null}

      <div className="border-line mt-14 border-t pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Referral"
            title="Referral links"
            lead="Every outbound link on the site points at /r/[slug], never at the destination — so a URL or promo code changes here, without a deploy."
            className="flex-1"
          />
          <Link href="/admin/services/links/new" className={buttonStyles({ variant: "secondary" })}>
            New link
          </Link>
        </div>

        <ul className="mt-6 flex flex-col">
          {referrals.map((referral) => (
            <li
              key={referral.slug}
              className="border-line flex flex-wrap items-start justify-between gap-4 border-t py-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/services/links/${referral.slug}`}
                    className="text-ink hover:text-accent font-serif text-lg transition-colors"
                  >
                    {referral.label}
                  </Link>

                  {referral.status === "DRAFT" ? <Badge>Retired</Badge> : null}
                  {referral.promoCode ? <Badge>{referral.promoCode}</Badge> : null}
                </div>

                <p className="text-ink-muted text-sm break-all">
                  /r/{referral.slug} → {referral.url}
                </p>
              </div>

              <form
                action={async () => {
                  "use server";
                  await setReferralLinkStatus(
                    referral.slug,
                    referral.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                  );
                }}
              >
                <Button type="submit" variant="secondary" size="sm">
                  {referral.status === "PUBLISHED" ? "Retire" : "Restore"}
                </Button>
              </form>
            </li>
          ))}
        </ul>

        {referrals.length === 0 ? (
          <p className="text-ink-muted mt-6 text-sm">
            No referral links. The services page hides its booking button until there is one.
          </p>
        ) : null}
      </div>
    </Container>
  );
}
