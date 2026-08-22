import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { CATEGORY_LABELS } from "@/server/queries/skills";
import { getSkillsForAdmin } from "@/server/queries/admin";
import type { SkillCategory } from "@/types/content";

export default async function AdminSkillsPage() {
  const skills = await getSkillsForAdmin();

  const order: SkillCategory[] = ["LANGUAGE", "FRAMEWORK", "DATABASE", "TOOL", "PRACTICE"];
  const groups = order
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: skills.filter((skill) => skill.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          level={1}
          eyebrow="Content"
          title="Skills"
          lead="Everything here should be evidenced by a project or role on the site."
          className="flex-1"
        />
        <Link href="/admin/skills/new" className={buttonStyles()}>
          Add skill
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-3">
            <h2 className="text-ink-muted text-xs font-medium tracking-[0.18em] uppercase">
              {group.label}
            </h2>

            <ul className="flex flex-wrap gap-2">
              {group.items.map((skill) => (
                <li key={skill.id}>
                  <Link
                    href={`/admin/skills/${skill.id}`}
                    className="border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink inline-flex min-h-9 items-center gap-2 rounded-sm border px-2.5 text-xs font-medium transition-colors"
                  >
                    {skill.name}
                    {skill.status === "DRAFT" ? <Badge>Draft</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {skills.length === 0 ? <p className="text-ink-muted mt-8 text-sm">No skills yet.</p> : null}
    </Container>
  );
}
