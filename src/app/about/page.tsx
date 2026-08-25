import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Rule } from "@/components/ui/rule";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatYearMonth } from "@/lib/format";
import { getEducation } from "@/server/queries/education";
import { getProfile, getSocialLinks } from "@/server/queries/profile";
import { getSkillsByCategory } from "@/server/queries/skills";

export const metadata: Metadata = {
  title: "About",
  description: "Background, current work, and how I approach building software.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [profile, education, skillGroups, socials] = await Promise.all([
    getProfile(),
    getEducation(),
    getSkillsByCategory(),
    getSocialLinks(),
  ]);

  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="About"
        title="Background and approach"
        lead={profile.availability ?? undefined}
      />

      <div className="mt-8 flex max-w-prose flex-col gap-5">
        {profile.longBio.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-ink-muted leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {/*
        The one entry point to the services area from the portfolio side.
        Deliberately understated and placed after the narrative: a recruiter
        reading top to bottom has already got what they came for, and a
        prospective client following a direct link never sees this page at all.
      */}
      <p className="text-ink-muted mt-6 max-w-prose text-sm">
        Looking for help with a move, packing, or handyman work? See{" "}
        <Link href="/services" className="text-accent hover:text-accent-hover transition-colors">
          what I take on
        </Link>
        , or{" "}
        <Link href="/contact" className="text-accent hover:text-accent-hover transition-colors">
          get in touch
        </Link>
        .
      </p>

      <Rule className="my-12" />

      <section className="flex flex-col gap-6">
        <SectionHeading eyebrow="Education" title="Education" />

        {education.map((entry) => (
          <div key={entry.slug} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-ink font-serif text-xl">{entry.institution}</h3>
              <p className="text-ink-muted text-sm">
                {entry.expected ? "Expected " : null}
                {entry.endDate ? formatYearMonth(entry.endDate) : null}
              </p>
            </div>

            <p className="text-ink-muted text-sm">
              {entry.degree} in {entry.field}
            </p>

            {entry.highlights.map((highlight) => (
              <p key={highlight} className="text-ink-muted text-sm leading-relaxed">
                {highlight}
              </p>
            ))}
          </div>
        ))}
      </section>

      <Rule className="my-12" />

      <section className="flex flex-col gap-6">
        <SectionHeading
          eyebrow="Skills"
          title="Tools I work with"
          lead="Everything here is used in a project or role listed on this site."
        />

        <dl className="flex flex-col gap-5">
          {skillGroups.map((group) => (
            <div key={group.category} className="flex flex-col gap-2">
              <dt className="text-ink-muted text-xs font-medium tracking-[0.18em] uppercase">
                {group.label}
              </dt>
              <dd className="text-ink text-sm leading-relaxed">
                {group.skills.map((skill) => skill.name).join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Rule className="my-12" />

      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Elsewhere" title="Find me" />

        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {socials.map((social) => (
            <li key={social.platform}>
              <a
                href={social.url}
                className="text-accent hover:text-accent-hover text-sm transition-colors"
                {...(social.platform === "EMAIL"
                  ? {}
                  : { target: "_blank", rel: "noopener noreferrer" })}
              >
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
