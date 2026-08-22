import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { ProjectCard } from "@/components/portfolio/project-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { getProjects, getProjectTechnologies } from "@/server/queries/projects";

export const metadata: Metadata = {
  title: "Projects · Bidipta Roy",
  description:
    "Full-stack applications, data platforms, and hackathon projects — what was built, and what came of it.",
};

/**
 * The technology filter is driven by the URL (`?tech=React`) and rendered on
 * the server, rather than by client-side state.
 *
 * The trade-off is deliberate: reading searchParams opts this page into
 * dynamic rendering, so it is no longer prerendered at build time. In
 * exchange the filter costs zero JavaScript, works with scripting disabled,
 * and — the reason that actually matters — produces a shareable URL. Being
 * able to send someone /projects?tech=Python is worth more than saving a few
 * milliseconds on a page with seven entries.
 */
export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const [params, projects, technologies] = await Promise.all([
    searchParams,
    getProjects(),
    getProjectTechnologies(),
  ]);

  const raw = params.tech;
  const selected = typeof raw === "string" ? raw : undefined;

  // An unrecognized ?tech= value falls back to showing everything rather than
  // an empty page — a hand-edited or stale URL should never look broken.
  const isValid = selected !== undefined && technologies.includes(selected);
  const active = isValid ? selected : undefined;

  const visible = active ? projects.filter((project) => project.tech.includes(active)) : projects;

  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Projects"
        title="Selected work"
        lead="What I built, the decisions behind it, and what came out of it."
      />

      <nav aria-label="Filter projects by technology" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/projects"
              aria-current={active ? undefined : "true"}
              className={cn(
                "inline-flex min-h-9 items-center rounded-sm border px-2.5 text-xs font-medium transition-colors",
                active
                  ? "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                  : "border-accent bg-accent text-on-accent",
              )}
            >
              All
            </Link>
          </li>

          {technologies.map((tech) => {
            const isActive = tech === active;

            return (
              <li key={tech}>
                <Link
                  href={`/projects?tech=${encodeURIComponent(tech)}`}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-sm border px-2.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {tech}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="text-ink-muted mt-6 text-sm" aria-live="polite">
        {visible.length} {visible.length === 1 ? "project" : "projects"}
        {active ? ` using ${active}` : null}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {visible.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </Container>
  );
}
