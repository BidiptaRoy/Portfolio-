import Link from "next/link";

import { auth } from "@/auth";
import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminCounts } from "@/server/queries/admin";

export default async function AdminPage() {
  const session = await auth();

  // Layer 2 again, at the page level. The layout already checked, but a page
  // should not rely on a parent having done so — layouts and pages can render
  // independently.
  if (!session?.user) return null;

  const counts = await getAdminCounts();

  const tiles = [
    { label: "Projects", value: counts.projects, href: "/admin/projects" },
    { label: "Experience", value: counts.experience, href: null },
    { label: "Education", value: counts.education, href: null },
    { label: "Skills", value: counts.skills, href: null },
  ];

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Dashboard"
        title="Content"
        lead="Counts include drafts. Editing for the remaining sections lands next."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const card = (
            <Card className="h-full">
              <CardTitle>{tile.value}</CardTitle>
              <CardBody className="mt-1">{tile.label}</CardBody>
            </Card>
          );

          return tile.href ? (
            <Link key={tile.label} href={tile.href} className="rounded-lg">
              {card}
            </Link>
          ) : (
            <div key={tile.label}>{card}</div>
          );
        })}
      </div>

      {counts.drafts > 0 ? (
        <p className="text-ink-muted mt-6 text-sm">
          {counts.drafts} project{counts.drafts === 1 ? "" : "s"} in draft — not visible on the
          public site.
        </p>
      ) : null}

      <div className="mt-8">
        <Link href="/admin/projects" className={buttonStyles({ variant: "secondary" })}>
          Manage projects
        </Link>
      </div>
    </Container>
  );
}
