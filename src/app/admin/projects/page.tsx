import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatYearMonth } from "@/lib/format";
import { setProjectStatus } from "@/server/actions/projects";
import { getProjectsForAdmin } from "@/server/queries/admin";

export default async function AdminProjectsPage() {
  // Includes drafts — this is the admin query, not the public façade.
  const projects = await getProjectsForAdmin();

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          level={1}
          eyebrow="Content"
          title="Projects"
          lead="Drafts are visible here and nowhere else."
          className="flex-1"
        />
        <Link href="/admin/projects/new" className={buttonStyles()}>
          New project
        </Link>
      </div>

      <ul className="mt-8 flex flex-col">
        {projects.map((project) => (
          <li
            key={project.slug}
            className="border-line flex flex-wrap items-start justify-between gap-4 border-t py-4"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/projects/${project.slug}`}
                  className="text-ink hover:text-accent font-serif text-lg transition-colors"
                >
                  {project.title}
                </Link>

                {project.status === "DRAFT" ? <Badge>Draft</Badge> : null}
                {project.featured ? <Badge>Featured</Badge> : null}
              </div>

              <p className="text-ink-muted text-sm">
                /projects/{project.slug}
                {project.completedAt ? ` · ${formatYearMonth(project.completedAt)}` : null}
                {` · order ${project.sortOrder}`}
              </p>
            </div>

            {/*
              A form rather than a button with an onClick: this posts to a
              Server Action, so it works without JavaScript and needs no
              client component. The action re-checks auth before acting.
            */}
            <form
              action={async () => {
                "use server";
                await setProjectStatus(
                  project.slug,
                  project.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                );
              }}
            >
              <Button type="submit" variant="secondary" size="sm">
                {project.status === "PUBLISHED" ? "Unpublish" : "Publish"}
              </Button>
            </form>
          </li>
        ))}
      </ul>

      {projects.length === 0 ? (
        <p className="text-ink-muted mt-8 text-sm">
          No projects yet. Create one, or run <code>npm run db:seed</code>.
        </p>
      ) : null}
    </Container>
  );
}
