import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatDateRange } from "@/lib/format";
import { getEducationForAdmin } from "@/server/queries/admin";

export default async function AdminEducationPage() {
  const entries = await getEducationForAdmin();

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          level={1}
          eyebrow="Content"
          title="Education"
          lead="Shown on the About page."
          className="flex-1"
        />
        <Link href="/admin/education/new" className={buttonStyles()}>
          New entry
        </Link>
      </div>

      <ul className="mt-8 flex flex-col">
        {entries.map((entry) => (
          <li key={entry.slug} className="border-line flex flex-col gap-1 border-t py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/education/${entry.slug}`}
                className="text-ink hover:text-accent font-serif text-lg transition-colors"
              >
                {entry.institution}
              </Link>
              {entry.status === "DRAFT" ? <Badge>Draft</Badge> : null}
              {entry.expected ? <Badge>Expected</Badge> : null}
            </div>

            <p className="text-ink-muted text-sm">
              {entry.degree} in {entry.field} ·{" "}
              {formatDateRange(entry.startDate, entry.endDate, false)}
            </p>
          </li>
        ))}
      </ul>

      {entries.length === 0 ? <p className="text-ink-muted mt-8 text-sm">No entries yet.</p> : null}
    </Container>
  );
}
