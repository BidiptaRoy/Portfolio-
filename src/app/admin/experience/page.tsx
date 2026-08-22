import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatDateRange } from "@/lib/format";
import { getExperienceForAdmin } from "@/server/queries/admin";

const SECTION_LABELS = {
  TECHNICAL: "Technical",
  PROFESSIONAL: "Professional",
  LEADERSHIP: "Leadership",
} as const;

export default async function AdminExperiencePage() {
  const entries = await getExperienceForAdmin();

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          level={1}
          eyebrow="Content"
          title="Experience"
          lead="Technical, professional, and leadership entries."
          className="flex-1"
        />
        <Link href="/admin/experience/new" className={buttonStyles()}>
          New entry
        </Link>
      </div>

      <ul className="mt-8 flex flex-col">
        {entries.map((entry) => (
          <li key={entry.slug} className="border-line flex flex-col gap-1 border-t py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/experience/${entry.slug}`}
                className="text-ink hover:text-accent font-serif text-lg transition-colors"
              >
                {entry.title}
              </Link>
              <Badge>{SECTION_LABELS[entry.kind]}</Badge>
              {entry.status === "DRAFT" ? <Badge>Draft</Badge> : null}
            </div>

            <p className="text-ink-muted text-sm">
              {entry.organization ?? "Independent"}
              {entry.platform ? ` · via ${entry.platform}` : null}
              {" · "}
              {formatDateRange(entry.startDate, entry.endDate, entry.current)}
              {` · order ${entry.sortOrder}`}
            </p>
          </li>
        ))}
      </ul>

      {entries.length === 0 ? <p className="text-ink-muted mt-8 text-sm">No entries yet.</p> : null}
    </Container>
  );
}
