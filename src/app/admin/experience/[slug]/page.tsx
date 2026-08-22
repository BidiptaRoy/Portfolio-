import { notFound } from "next/navigation";

import { ExperienceForm } from "@/components/admin/experience-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { deleteExperience } from "@/server/actions/content";
import { getExperienceEntryForAdmin } from "@/server/queries/admin";

export default async function EditExperiencePage({
  params,
}: PageProps<"/admin/experience/[slug]">) {
  const { slug } = await params;
  const entry = await getExperienceEntryForAdmin(slug);

  if (!entry) notFound();

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Experience"
        title={entry.title}
        lead={
          entry.status === "PUBLISHED"
            ? "Live on /experience."
            : "Draft. Not visible on the public site."
        }
      />

      <div className="mt-8">
        <ExperienceForm entry={entry} />
      </div>

      <div className="border-line mt-12 border-t pt-6">
        <h2 className="text-ink font-serif text-lg">Delete</h2>
        <p className="text-ink-muted mt-1 max-w-prose text-sm">
          Permanent. Setting the status to draft hides it from the public site while keeping the
          record.
        </p>

        <form
          action={async () => {
            "use server";
            await deleteExperience(entry.slug);
          }}
          className="mt-4"
        >
          <Button type="submit" variant="secondary" size="sm">
            Delete this entry
          </Button>
        </form>
      </div>
    </Container>
  );
}
