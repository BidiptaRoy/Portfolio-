import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Rule } from "@/components/ui/rule";
import { formatYearMonth } from "@/lib/format";
import { getProjectBySlug, getProjectSlugs } from "@/server/queries/projects";

/** Prerender every project at build time. */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) return { title: "Project not found · Bidipta Roy" };

  return {
    title: `${project.title} · Bidipta Roy`,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  // Covers both an unknown slug and a project held back as a draft — the
  // query filters to PUBLISHED, so an unpublished project is correctly
  // indistinguishable from one that does not exist.
  if (!project) notFound();

  const hasLinks = Boolean(project.liveUrl ?? project.repoUrl);

  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <Link href="/projects" className="text-ink-muted hover:text-accent text-sm transition-colors">
        ← All projects
      </Link>

      <header className="mt-8 flex flex-col gap-4">
        {project.completedAt ? <Eyebrow>{formatYearMonth(project.completedAt)}</Eyebrow> : null}

        <h1 className="text-ink font-serif text-4xl leading-[1.1] sm:text-5xl">{project.title}</h1>

        <p className="text-ink-muted text-lg leading-relaxed">{project.summary}</p>

        <ul className="flex flex-wrap gap-1.5">
          {project.tech.map((tech) => (
            <li key={tech}>
              <Badge>{tech}</Badge>
            </li>
          ))}
        </ul>

        {hasLinks ? (
          <div className="mt-2 flex flex-wrap gap-3">
            {project.liveUrl ? (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ size: "sm" })}
              >
                Live demo ↗
              </a>
            ) : null}
            {project.repoUrl ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Source ↗
              </a>
            ) : null}
          </div>
        ) : null}
      </header>

      <Rule className="my-10" />

      <section className="flex flex-col gap-4">
        <h2 className="text-ink font-serif text-2xl">Overview</h2>
        <p className="text-ink-muted leading-relaxed">{project.description}</p>
      </section>

      {project.role ? (
        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-ink font-serif text-2xl">My role</h2>
          <p className="text-ink-muted leading-relaxed">{project.role}</p>
        </section>
      ) : null}

      {/*
        Outcomes and challenges are omitted entirely when empty rather than
        rendered as blank headings. Most projects have neither recorded yet,
        and an empty "Challenges" heading advertises the gap.
      */}
      {project.outcomes.length > 0 ? (
        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-ink font-serif text-2xl">Outcomes</h2>
          <ul className="flex flex-col gap-2.5">
            {project.outcomes.map((outcome) => (
              <li key={outcome} className="text-ink-muted flex gap-3 leading-relaxed">
                <span aria-hidden className="bg-line-strong mt-3 h-px w-3.5 shrink-0" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {project.challenges.length > 0 ? (
        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-ink font-serif text-2xl">Challenges</h2>
          <ul className="flex flex-col gap-2.5">
            {project.challenges.map((challenge) => (
              <li key={challenge} className="text-ink-muted flex gap-3 leading-relaxed">
                <span aria-hidden className="bg-line-strong mt-3 h-px w-3.5 shrink-0" />
                <span>{challenge}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
