import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { ContactForm } from "@/components/portfolio/contact-form";
import { buttonStyles } from "@/components/ui/button";
import { Rule } from "@/components/ui/rule";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProfile, getSocialLinks } from "@/server/queries/profile";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about engineering roles, collaboration, or professional services.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [profile, socials] = await Promise.all([getProfile(), getSocialLinks()]);

  const elsewhere = socials.filter((social) => social.platform !== "EMAIL");

  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Contact"
        title="Get in touch"
        lead={profile.availability ?? undefined}
      />

      <div className="mt-8 flex flex-col gap-6">
        <p className="text-ink-muted leading-relaxed">
          Happy to talk about engineering roles, collaboration on a project, or independent
          professional services. Send a message here and it reaches me directly.
        </p>

        <ContactForm email={profile.email} />

        <Rule className="my-2" />

        {/*
          The mailto stays. A form is a request to trust a stranger's server
          with your message and hope; some people would simply rather use
          their own mail client, and the address is already public on GitHub
          and LinkedIn, so showing it costs nothing.
        */}
        <div className="flex flex-col gap-2">
          <p className="text-ink-muted text-xs font-medium tracking-[0.18em] uppercase">
            Or email directly
          </p>
          <a href={`mailto:${profile.email}`} className={buttonStyles({ className: "self-start" })}>
            {profile.email}
          </a>
        </div>

        {elsewhere.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-ink-muted text-xs font-medium tracking-[0.18em] uppercase">
              Elsewhere
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {elsewhere.map((social) => (
                <li key={social.platform}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover text-sm transition-colors"
                  >
                    {social.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-ink-muted text-sm">Based in {profile.location}.</p>
      </div>
    </Container>
  );
}
