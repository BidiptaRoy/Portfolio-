import { ProfileForm } from "@/components/admin/profile-form";
import { ProfilePhoto } from "@/components/admin/profile-photo";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { isStorageConfigured } from "@/lib/storage";
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

      {/*
        Only once the row exists. A photo has nowhere to attach before then,
        and the profile form above is what creates it.
      */}
      {profile ? (
        <ProfilePhoto
          photoUrl={profile.photoUrl}
          name={profile.name}
          storageConfigured={isStorageConfigured()}
        />
      ) : null}
    </Container>
  );
}
