import { experienceSchema } from "@/lib/validation/content";
import type { Experience } from "@/types/content";

/**
 * Experience, most recent first.
 *
 * TECHNICAL and PROFESSIONAL both render with identical visual weight; the
 * label does the differentiating. Nothing here is presented as lesser.
 *
 * TODO — Taskrabbit: Bidipta provides moving, event staffing, IT assistance,
 * packing, and office administration services through the platform, but has
 * not yet supplied dates. It is omitted rather than guessed. When added it
 * must use engagementType PLATFORM_ENGAGEMENT with platform "Taskrabbit" and
 * organization null — the platform is the channel he found the work through,
 * never the employer.
 */
export const experience: Experience[] = [
  {
    slug: "hack4impact-design-intern",
    kind: "TECHNICAL",
    engagementType: "INTERNSHIP",
    title: "UI/UX Design Intern",
    organization: "BU Hack4Impact",
    platform: null,
    location: "Boston, MA",
    startDate: "2026-05",
    endDate: null,
    current: true,
    summary:
      "Designing interfaces for web applications built pro bono for nonprofit organizations.",
    highlights: [],
    skills: ["UI/UX Design", "Product Design", "React"],
  },
  {
    slug: "hack4impact-member",
    kind: "TECHNICAL",
    engagementType: "MEMBERSHIP",
    title: "Member",
    organization: "BU Hack4Impact",
    platform: null,
    location: "Boston, MA",
    startDate: "2025-09",
    endDate: "2025-12",
    current: false,
    summary:
      "Built collaborative web projects for nonprofit organizations using JavaScript, HTML/CSS, and React.",
    highlights: [],
    skills: ["JavaScript", "React", "HTML/CSS"],
  },
  {
    slug: "swimtastic-coach",
    kind: "PROFESSIONAL",
    engagementType: "EMPLOYMENT",
    title: "Swim Coach",
    organization: "Swimtastic",
    platform: null,
    location: "Hempstead, NY",
    startDate: "2025-05",
    endDate: "2025-08",
    current: false,
    summary:
      "Coached youth and adult swimmers one-to-one and in small groups, building individualized plans to improve stroke efficiency.",
    highlights: ["Managed the weekly student roster across all instructors"],
    skills: ["Coaching", "Program Management", "1:1 Instruction"],
  },
  {
    slug: "long-island-swim-school-instructor",
    kind: "PROFESSIONAL",
    engagementType: "EMPLOYMENT",
    title: "Swim Instructor",
    organization: "Long Island Swim School",
    platform: null,
    location: "Garden City, NY",
    startDate: "2021-09",
    endDate: "2023-08",
    current: false,
    summary:
      "Taught group lessons to more than fifty students aged four to twelve, covering stroke fundamentals, technique, and water safety.",
    highlights: [
      "Developed personalized training plans and tracked skill progression across the season",
    ],
    skills: ["Youth Instruction", "Curriculum Design", "Water Safety"],
  },
].map((entry, index) =>
  experienceSchema.parse({ ...entry, status: "PUBLISHED", sortOrder: index }),
);
