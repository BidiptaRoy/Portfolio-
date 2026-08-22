import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/admin/project-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { deleteProject } from "@/server/actions/projects";
import { getProjectForAdmin } from "@/server/queries/admin";

export default async function EditProjectPage({ params }: PageProps<"/admin/projects/[slug]">) {
  const { slug } = await params;
  const project = await getProjectForAdmin(slug);

  if (!project) notFound();

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Projects"
        title={project.title}
        lead={
          project.status === "PUBLISHED"
            ? "Live. Changes appear on the public site as soon as you save."
            : "Draft. Not visible on the public site."
        }
      />

      {project.status === "PUBLISHED" ? (
        <Link
          href={`/projects/${project.slug}`}
          className="text-accent hover:text-accent-hover mt-4 inline-block text-sm transition-colors"
        >
          View public page ↗
        </Link>
      ) : null}

      <div className="mt-8">
        <ProjectForm project={project} />
      </div>

      <div className="border-line mt-12 border-t pt-6">
        <h2 className="text-ink font-serif text-lg">Delete</h2>
        <p className="text-ink-muted mt-1 max-w-prose text-sm">
          Permanent, and the URL <code>/projects/{project.slug}</code> will start returning 404 for
          anyone who bookmarked or linked it. Unpublishing instead keeps the record and the option
          to restore it.
        </p>

        <form
          action={async () => {
            "use server";
            await deleteProject(project.slug);
          }}
          className="mt-4"
        >
          <Button type="submit" variant="secondary" size="sm">
            Delete this project
          </Button>
        </form>
      </div>
    </Container>
  );
}
