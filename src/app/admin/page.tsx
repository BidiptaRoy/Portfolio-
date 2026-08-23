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
    { label: "Experience", value: counts.experience, href: "/admin/experience" },
    { label: "Education", value: counts.education, href: "/admin/education" },
    { label: "Skills", value: counts.skills, href: "/admin/skills" },
    // Images have no section of their own — they are managed on the project
    // they belong to, so this tile points at the project list.
    { label: "Project images", value: counts.images, href: "/admin/projects" },
    { label: "Resume revisions", value: counts.resumes, href: "/admin/resume" },
    { label: "Unread messages", value: counts.unreadMessages, href: "/admin/messages" },
  ];

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Dashboard"
        title="Content"
        lead="Counts include drafts. Every section here is editable without touching code."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/*
        Worth saying out loud: an unpublished resume is a deliberate, supported
        state, but it is also indistinguishable from having forgotten to
        publish one. The Resume page silently renders without a download link.
      */}
      {counts.publishedResumes === 0 ? (
        <p className="text-ink-muted mt-2 text-sm">
          No resume is published — <code>/resume</code> currently offers no download.
        </p>
      ) : null}

      {/*
        A message that arrived but was never emailed is the failure mode this
        whole design is built around: the message is safe, but nothing told
        anyone it exists. It must be visible somewhere that gets looked at.
      */}
      {counts.unsentNotifications > 0 ? (
        <p className="text-ink-muted mt-2 text-sm">
          {counts.unsentNotifications} message{counts.unsentNotifications === 1 ? "" : "s"} saved
          without an email notification — check <code>RESEND_API_KEY</code>.
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
