import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProfile, getSocialLinks } from "@/server/queries/profile";

export const metadata: Metadata = {
  title: "Contact · Bidipta Roy",
  description: "Get in touch about engineering roles, collaboration, or professional services.",
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
          The fastest way to reach me is email — I reply quickly. Happy to talk about engineering
          roles, collaboration on a project, or independent professional services.
        </p>

        {/*
          A real mailto rather than a form. The contact form, its rate limiting,
          and spam protection are Phase 9; shipping a form that silently drops
          messages would be worse than not having one. The address is already
          public on GitHub and LinkedIn, so exposing it here costs nothing new.
        */}
        <a href={`mailto:${profile.email}`} className={buttonStyles({ className: "self-start" })}>
          {profile.email}
        </a>

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
