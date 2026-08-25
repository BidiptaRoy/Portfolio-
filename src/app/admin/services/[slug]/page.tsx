import { notFound } from "next/navigation";

import { ServiceForm } from "@/components/admin/service-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { deleteService } from "@/server/actions/services";
import { getServiceForAdmin } from "@/server/queries/admin";

export default async function EditServicePage({ params }: PageProps<"/admin/services/[slug]">) {
  const { slug } = await params;
  const service = await getServiceForAdmin(slug);

  if (!service) notFound();

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Services"
        title={service.name}
        lead="Changes appear on /services as soon as they are saved."
      />

      <div className="mt-8">
        <ServiceForm service={service} />
      </div>

      <div className="border-line mt-12 border-t pt-6">
        <h2 className="text-ink font-serif text-lg">Delete</h2>
        <p className="text-ink-muted mt-1 max-w-prose text-sm">
          Permanent. Unpublishing instead keeps the record and the option to restore it, which is
          usually what you want for work you have simply stopped taking on.
        </p>

        <form
          action={async () => {
            "use server";
            await deleteService(service.slug);
          }}
          className="mt-4"
        >
          <Button type="submit" variant="secondary" size="sm">
            Delete this service
          </Button>
        </form>
      </div>
    </Container>
  );
}
