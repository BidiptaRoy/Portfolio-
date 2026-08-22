import { notFound } from "next/navigation";

import { EducationForm } from "@/components/admin/education-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { deleteEducation } from "@/server/actions/content";
import { getEducationEntryForAdmin } from "@/server/queries/admin";

export default async function EditEducationPage({ params }: PageProps<"/admin/education/[slug]">) {
  const { slug } = await params;
  const entry = await getEducationEntryForAdmin(slug);

  if (!entry) notFound();

  return (
    <Container className="py-12">
      <SectionHeading level={1} eyebrow="Education" title={entry.institution} />

      <div className="mt-8">
        <EducationForm entry={entry} />
      </div>

      <div className="border-line mt-12 border-t pt-6">
        <h2 className="text-ink font-serif text-lg">Delete</h2>

        <form
          action={async () => {
            "use server";
            await deleteEducation(entry.slug);
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
