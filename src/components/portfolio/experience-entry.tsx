import { Badge } from "@/components/ui/badge";
import { formatDateRange } from "@/lib/format";
import type { Experience } from "@/types/content";

/**
 * One experience entry. Every kind — technical, professional, leadership —
 * renders identically. The section heading does the differentiating; giving
 * non-technical work a lighter treatment would undercut it on the page while
 * pretending not to.
 */
export function ExperienceEntry({ entry }: { entry: Experience }) {
  return (
    <article className="border-line grid gap-2 border-t py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
      <div className="flex flex-col gap-0.5">
        <p className="text-ink-muted text-sm">
          {formatDateRange(entry.startDate, entry.endDate, entry.current)}
        </p>
        {entry.location ? <p className="text-ink-muted text-xs">{entry.location}</p> : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-ink font-serif text-xl">{entry.title}</h3>

          {/*
            The organization line. `platform` renders as "via Taskrabbit" and
            is deliberately never shown as the organization: a marketplace is
            the channel the work was found through, not the employer. When
            there is no organization at all, the platform alone carries it.
          */}
          <p className="text-ink-muted text-sm">
            {entry.organization}
            {entry.organization && entry.platform ? " · " : null}
            {entry.platform ? <span className="italic">via {entry.platform}</span> : null}
          </p>
        </div>

        <p className="text-ink-muted text-sm leading-relaxed">{entry.summary}</p>

        {entry.highlights.length > 0 ? (
          <ul className="text-ink-muted flex flex-col gap-1.5 text-sm leading-relaxed">
            {entry.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2.5">
                <span aria-hidden className="bg-line-strong mt-2 h-px w-3 shrink-0" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {entry.skills.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {entry.skills.map((skill) => (
              <li key={skill}>
                <Badge>{skill}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
