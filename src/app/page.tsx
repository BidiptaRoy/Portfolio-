import Image from "next/image";
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
      {/*
        Hero — answers "should I keep reading?" in about five seconds.

        Two columns when there is a portrait, one when there is not. The text
        column comes first in the DOM either way, so the name and the summary
        are what a screen reader and a narrow phone reach first; the photo
        supports the introduction rather than delaying it.
      */}
      <section className="flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-12">
        <div className="flex flex-1 flex-col gap-6">
          <Eyebrow>Computer Science · Boston University</Eyebrow>

          <h1 className="text-ink font-serif text-4xl leading-[1.05] sm:text-6xl">
            {profile.name}
          </h1>

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
        </div>

        {profile.photoUrl ? (
          <div className="w-full max-w-[16rem] shrink-0 sm:w-56 lg:w-64">
            {/*
              `priority` because this is the largest element above the fold on
              the site's most-visited page — the one image where lazy loading
              costs a visible beat rather than saving one.

              `object-top` keeps a face in frame when a tall photo is cropped
              to this ratio; a portrait's subject is near the top, and
              centre-cropping a full-length shot lands on a torso.
            */}
            <div className="bg-surface border-line relative aspect-[4/5] overflow-hidden rounded-lg border">
              <Image
                src={profile.photoUrl}
                alt={profile.name}
                fill
                priority
                sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 16rem"
                className="object-cover object-top"
              />
            </div>
          </div>
        ) : null}
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
