import Link from "next/link";

import { Container } from "@/components/layout/container";
import { ExperienceEntry } from "@/components/portfolio/experience-entry";
import { PersonJsonLd } from "@/components/portfolio/person-json-ld";
import { ProjectCard } from "@/components/portfolio/project-card";
import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Rule } from "@/components/ui/rule";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSiteUrl } from "@/lib/site";
import { getEducation } from "@/server/queries/education";
import { getCurrentExperience, getExperienceByKind } from "@/server/queries/experience";
import { getProfile, getSocialLinks } from "@/server/queries/profile";
import { getFeaturedProjects } from "@/server/queries/projects";

export default async function HomePage() {
  const [profile, current, featured, technical, education, socials] = await Promise.all([
    getProfile(),
    getCurrentExperience(),
    getFeaturedProjects(3),
    getExperienceByKind("TECHNICAL"),
    getEducation(),
    getSocialLinks(),
  ]);

  return (
    <Container className="py-16 sm:py-24">
      <PersonJsonLd
        profile={profile}
        education={education}
        socials={socials}
        siteUrl={getSiteUrl()}
      />
      {/* Hero — answers "should I keep reading?" in about five seconds. */}
      <section className="flex flex-col gap-6">
        <Eyebrow>Computer Science · Boston University</Eyebrow>

        <h1 className="text-ink font-serif text-4xl leading-[1.05] sm:text-6xl">{profile.name}</h1>

        <p className="text-ink-muted max-w-xl text-lg leading-relaxed">{profile.shortBio}</p>

        {current ? (
          <p className="text-ink-muted text-sm">
            Currently{" "}
            <span className="text-ink">
              {current.title}
              {current.organization ? ` at ${current.organization}` : null}
            </span>
            {profile.availability ? ` · ${profile.availability}` : null}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/projects" className={buttonStyles()}>
            View projects
          </Link>
          <Link href="/contact" className={buttonStyles({ variant: "secondary" })}>
            Get in touch
          </Link>
        </div>
      </section>

      <Rule ornament className="my-16" />

      <section className="flex flex-col gap-8">
        <SectionHeading
          eyebrow="Selected work"
          title="What I've built"
          lead="Full-stack applications, data-driven interfaces, and things built to be used rather than demoed."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>

        <Link
          href="/projects"
          className="text-accent hover:text-accent-hover self-start text-sm transition-colors"
        >
          All projects →
        </Link>
      </section>

      {technical.length > 0 ? (
        <>
          <Rule className="my-16" />

          <section className="flex flex-col gap-8">
            <SectionHeading eyebrow="Experience" title="Where I've worked" />

            <div>
              {technical.map((entry) => (
                <ExperienceEntry key={entry.slug} entry={entry} />
              ))}
            </div>

            <Link
              href="/experience"
              className="text-accent hover:text-accent-hover self-start text-sm transition-colors"
            >
              Full experience →
            </Link>
          </section>
        </>
      ) : null}

      <Rule className="my-16" />

      <section className="flex flex-col gap-4">
        <SectionHeading
          eyebrow="Contact"
          title="Get in touch"
          lead="Open to conversations about engineering roles, collaboration, or professional services."
        />

        <Link
          href="/contact"
          className={buttonStyles({ variant: "secondary", className: "self-start" })}
        >
          Contact
        </Link>
      </section>
    </Container>
  );
}
