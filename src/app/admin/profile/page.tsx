import { ProfileForm } from "@/components/admin/profile-form";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProfileForAdmin } from "@/server/queries/admin";

export default async function AdminProfilePage() {
  const profile = await getProfileForAdmin();

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Content"
        title="Profile"
        lead="Drives the hero, the About narrative, page descriptions in search results, and the structured data search engines read."
      />

      <div className="mt-8">
        <ProfileForm profile={profile} />
      </div>
    </Container>
  );
}
