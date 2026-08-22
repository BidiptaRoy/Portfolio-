import { skillSchema } from "@/lib/validation/content";
import type { Skill } from "@/types/content";

/**
 * Skills, grouped by category in the UI.
 *
 * Every entry here is evidenced by a project or role in `src/content/`.
 * That is the standard: if nothing on the site demonstrates it, it does not
 * belong on the list. A skills section a recruiter can cross-check against
 * real work is worth far more than a long one they cannot.
 */
export const skills: Skill[] = [
  { name: "Python", category: "LANGUAGE" },
  { name: "JavaScript", category: "LANGUAGE" },
  { name: "TypeScript", category: "LANGUAGE" },
  { name: "Java", category: "LANGUAGE" },
  { name: "C", category: "LANGUAGE" },
  { name: "HTML/CSS", category: "LANGUAGE" },

  { name: "React", category: "FRAMEWORK" },
  { name: "Next.js", category: "FRAMEWORK" },
  { name: "Node.js", category: "FRAMEWORK" },
  { name: "Express", category: "FRAMEWORK" },
  { name: "Flask", category: "FRAMEWORK" },
  { name: "Tailwind CSS", category: "FRAMEWORK" },

  { name: "MongoDB", category: "DATABASE" },
  { name: "SQLite", category: "DATABASE" },

  { name: "Git", category: "TOOL" },
  { name: "Vercel", category: "TOOL" },
  { name: "Pandas", category: "TOOL" },
  { name: "GeoPandas", category: "TOOL" },

  { name: "REST API design", category: "PRACTICE" },
  { name: "Authentication (JWT)", category: "PRACTICE" },
  { name: "UI/UX Design", category: "PRACTICE" },
].map((skill, index) => skillSchema.parse({ ...skill, status: "PUBLISHED", sortOrder: index }));
