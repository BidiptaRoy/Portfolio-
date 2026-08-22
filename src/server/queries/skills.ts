import "server-only";

import { skills } from "@/content/skills";
import type { Skill, SkillCategory } from "@/types/content";

/** Read façade for skills. See `./projects.ts` for rationale. */

const CATEGORY_ORDER: SkillCategory[] = ["LANGUAGE", "FRAMEWORK", "DATABASE", "TOOL", "PRACTICE"];

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  LANGUAGE: "Languages",
  FRAMEWORK: "Frameworks & Libraries",
  DATABASE: "Databases",
  TOOL: "Tools",
  PRACTICE: "Practices",
};

const published = (items: Skill[]) =>
  items.filter((item) => item.status === "PUBLISHED").sort((a, b) => a.sortOrder - b.sortOrder);

export async function getSkills(): Promise<Skill[]> {
  return published(skills);
}

/**
 * Skills grouped for display, in a fixed category order. Empty categories are
 * dropped so the UI never renders a heading with nothing beneath it.
 */
export async function getSkillsByCategory(): Promise<
  { category: SkillCategory; label: string; skills: Skill[] }[]
> {
  const all = published(skills);

  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    skills: all.filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0);
}
