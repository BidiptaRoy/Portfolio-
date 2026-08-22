import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { formatYearMonth } from "@/lib/format";
import type { Project } from "@/types/content";

/**
 * A project summary card linking to its detail page.
 *
 * The whole card is one link rather than a card with links inside it: nested
 * interactive elements are a common accessibility failure, and a single large
 * target is easier to hit on a phone. External repo and demo links live on
 * the detail page, where they are not competing with the card's own target.
 */
export function ProjectCard({
  project,
  headingLevel = "h3",
}: {
  project: Project;
  /** Pass "h2" when the grid sits directly under the page h1. */
  headingLevel?: "h2" | "h3";
}) {
  return (
    <Link href={`/projects/${project.slug}`} className="group block rounded-lg">
      <Card
        accent={project.featured}
        className="group-hover:border-line-strong flex h-full flex-col gap-3 transition-colors"
      >
        <div className="flex flex-col gap-1">
          {project.completedAt ? (
            <p className="text-ink-muted text-xs tracking-wide uppercase">
              {formatYearMonth(project.completedAt)}
            </p>
          ) : null}
          <CardTitle as={headingLevel} className="group-hover:text-accent">
            {project.title}
          </CardTitle>
        </div>

        <CardBody className="flex-1">{project.summary}</CardBody>

        <ul className="flex flex-wrap gap-1.5">
          {project.tech.slice(0, 4).map((tech) => (
            <li key={tech}>
              <Badge>{tech}</Badge>
            </li>
          ))}
          {project.tech.length > 4 ? (
            <li>
              <Badge>+{project.tech.length - 4}</Badge>
            </li>
          ) : null}
        </ul>
      </Card>
    </Link>
  );
}
