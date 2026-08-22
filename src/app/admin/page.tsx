import { auth } from "@/auth";
import { Container } from "@/components/layout/container";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getEducation } from "@/server/queries/education";
import { getExperience } from "@/server/queries/experience";
import { getProjects } from "@/server/queries/projects";
import { getSkills } from "@/server/queries/skills";

/**
 * Placeholder dashboard. The editing interface is Phase 8.
 *
 * It shows live counts rather than static text so that it proves something
 * real: that an authenticated session can reach the database through the same
 * façade the public site uses.
 */
export default async function AdminPage() {
  const session = await auth();

  // Layer 2 again, at the page level. The layout already checked, but a page
  // should not depend on a parent having done so — layouts and pages can be
  // rendered independently.
  if (!session?.user) return null;

  const [projects, experience, education, skills] = await Promise.all([
    getProjects(),
    getExperience(),
    getEducation(),
    getSkills(),
  ]);

  const counts = [
    { label: "Projects", value: projects.length },
    { label: "Experience", value: experience.length },
    { label: "Education", value: education.length },
    { label: "Skills", value: skills.length },
  ];

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Dashboard"
        title="Content"
        lead="Editing arrives in Phase 8. These counts are read live from the database."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((item) => (
          <Card key={item.label}>
            <CardTitle>{item.value}</CardTitle>
            <CardBody className="mt-1">{item.label}</CardBody>
          </Card>
        ))}
      </div>

      <p className="text-ink-muted mt-8 text-sm">
        Counts reflect published records only, because the dashboard reads through the same façade
        as the public site. Phase 8 adds queries that include drafts.
      </p>
    </Container>
  );
}
