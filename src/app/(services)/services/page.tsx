import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { proseLinkStyles } from "@/components/ui/prose-link";
import { Rule } from "@/components/ui/rule";
import { SectionHeading } from "@/components/ui/section-heading";
import { getReferralLinks, getServices } from "@/server/queries/services";

/**
 * The client-facing services page.
 *
 * Its own route group, `(services)`, as planned in docs/architecture.md — the
 * seam that lets this area grow its own layout later without restructuring
 * anything. The group adds no URL segment, so this is `/services`.
 *
 * Deliberately absent from the main navigation. Recruiters and prospective
 * clients want different things and each is mildly put off by content aimed at
 * the other, so the nav stays optimized for the primary audience while this
 * page remains a first-class, indexed, directly linkable destination reached
 * from About and the footer. See docs/decisions/0013 for the trigger that
 * would promote it to the nav.
 */
export const metadata: Metadata = {
  title: "Services",
  description:
    "Moving assistance, home packing, and handyman work offered directly to clients in Boston, New York City, and Long Island, booked through Taskrabbit.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const [services, referrals] = await Promise.all([getServices(), getReferralLinks()]);

  // Every service currently shares one area; showing it once above the list
  // reads better than repeating the same line under three cards. When they
  // diverge, this falls back to per-card display.
  const areas = new Set(services.map((service) => service.serviceArea).filter(Boolean));
  const sharedArea = areas.size === 1 ? [...areas][0] : null;

  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Services"
        title="Work I take on directly"
        lead="Alongside studying computer science, I take on moving, packing, and handyman work for clients directly. Booking and payment are handled through Taskrabbit."
      />

      {/*
        Rendered as its own labelled line rather than inline after "Available
        in", because the area carries a seasonal schedule and reads as a
        sentence, not as a place name. Coverage genuinely moves between cities
        during the year, and a client checking whether that includes them is
        the first question this page has to answer.
      */}
      {sharedArea ? (
        <p className="text-ink-muted mt-6 max-w-prose text-sm leading-relaxed">
          <span className="text-ink font-medium">Where and when: </span>
          {sharedArea}
        </p>
      ) : null}

      {services.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.slug} className="flex flex-col gap-3">
              {/* h2, because the page's h1 is the section heading above and
                  the document must not skip a level. */}
              <CardTitle as="h2">{service.name}</CardTitle>

              <p className="text-ink-muted text-sm leading-relaxed">{service.description}</p>

              {service.includes.length > 0 ? (
                <ul className="text-ink-muted mt-1 flex list-disc flex-col gap-1 pl-4 text-sm">
                  {service.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {/* Omitted entirely when unset, rather than rendering an empty
                  line — the same rule the project pages follow for outcomes. */}
              {service.pricingNote ? (
                <p className="text-ink-muted mt-1 text-xs">{service.pricingNote}</p>
              ) : null}

              {!sharedArea && service.serviceArea ? (
                <p className="text-ink-muted mt-1 text-xs">{service.serviceArea}</p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        /*
          A supported state, and as of Phase 12a the EXPECTED one — Bidipta
          chose to run this page on the Taskrabbit profile alone rather than
          maintain a service list in two places, which is a reasonable call
          when the platform's own listing is always current and this one would
          not be.

          So this copy must read as finished, not as a page waiting for
          content. The earlier wording ("Services are not listed yet") said the
          opposite, directly above a live promo code.

          Adding services at /admin/services replaces this paragraph with the
          cards, and nothing else has to change.
        */
        <p className="text-ink-muted mt-8 max-w-prose text-sm leading-relaxed">
          The full list of what I take on, along with current rates and availability, lives on my
          Taskrabbit profile — it is always up to date there, which a copy here would not be. Moving
          help, packing, and handyman work are the usual ones.
        </p>
      )}

      <Rule className="my-14" />

      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Booking" title="How to book" />

        <p className="text-ink-muted max-w-prose text-sm leading-relaxed">
          Everything runs through Taskrabbit — scheduling, messaging, and payment are handled there,
          which means the arrangement is documented and insured on both sides rather than resting on
          a text message.
        </p>

        {referrals.length > 0 ? (
          <div className="mt-2 flex flex-col gap-4">
            {referrals.map((referral) => (
              <div key={referral.slug} className="flex flex-col gap-2">
                {referral.description ? (
                  <p className="text-ink-muted max-w-prose text-sm">{referral.description}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  {/*
                    Points at the internal /r/[slug] route, never at the
                    destination. That indirection is the whole reason the
                    ReferralLink model exists: adding click tracking later is
                    one insert in one file rather than an audit of every page
                    for links somebody forgot to update.
                  */}
                  <Link href={`/r/${referral.slug}`} className={buttonStyles()}>
                    {referral.label}
                  </Link>

                  {referral.promoCode ? (
                    <p className="text-ink-muted text-sm">
                      Promo code{" "}
                      <code className="text-ink border-line rounded border px-1.5 py-0.5 text-xs">
                        {referral.promoCode}
                      </code>
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <p className="text-ink-muted mt-2 text-sm">
          Not sure whether something fits?{" "}
          <Link href="/contact" className={proseLinkStyles}>
            Send me a message
          </Link>{" "}
          and I will tell you honestly.
        </p>
      </section>
    </Container>
  );
}
