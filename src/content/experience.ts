import { assertUniqueSlugs, experienceSchema } from "@/lib/validation/content";
import type { Experience } from "@/types/content";

/**
 * Experience, most relevant first within each kind.
 *
 * TECHNICAL, PROFESSIONAL, and LEADERSHIP all render with identical visual
 * weight; the section label does the differentiating. Nothing here is
 * presented as lesser.
 *
 * Sources: Bidipta's resume (authoritative for dates and figures) and his
 * own account for the Taskrabbit work, which predates the resume.
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
    title: "Member and Collaborator",
    organization: "BU Hack4Impact",
    platform: null,
    location: "Boston, MA",
    startDate: "2025-09",
    endDate: null,
    current: true,
    summary:
      "Collaborating on group web projects for nonprofit clients using JavaScript, HTML/CSS, and React.",
    highlights: ["Returning as a nonprofit software engineer in Fall 2026"],
    skills: ["JavaScript", "React", "HTML/CSS"],
  },
  {
    slug: "taskrabbit-services",
    kind: "PROFESSIONAL",
    engagementType: "PLATFORM_ENGAGEMENT",
    title: "Independent Professional Services",
    // No employer: these are direct engagements with individual clients.
    organization: null,
    // Taskrabbit is where the work is found, not who the work is for.
    // Rendered as "via Taskrabbit" — never as an employer.
    platform: "Taskrabbit",
    location: "Boston, MA · Greater New York",
    startDate: "2026-04",
    endDate: null,
    current: true,
    summary:
      "Providing moving assistance, home packing, and general handyman services directly to clients, sourced through the Taskrabbit platform.",
    highlights: [
      "Move-in and move-out support for apartment clients, concentrated around the month-end and month-start peak",
      "Full-home packing for residential moves",
      "General handyman and assembly tasks",
    ],
    skills: ["Client Service", "Logistics", "Scheduling"],
  },
  {
    slug: "swimtastic-coach",
    kind: "PROFESSIONAL",
    engagementType: "EMPLOYMENT",
    title: "Swim Coach",
    organization: "SWIMTastic Swim School",
    platform: null,
    location: "Hempstead, NY",
    startDate: "2025-05",
    endDate: null,
    current: true,
    summary:
      "Coaching youth and adult swimmers one-to-one and in small groups, building individualized plans to improve stroke efficiency.",
    highlights: ["Manages the weekly student roster across all instructors"],
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
      "Taught group lessons covering stroke fundamentals, technique, and water safety for ages four to twelve.",
    highlights: ["Taught 100+ students using personalized training plans"],
    skills: ["Youth Instruction", "Curriculum Design", "Water Safety"],
  },
  {
    slug: "bu-bjj-club-secretary",
    kind: "LEADERSHIP",
    engagementType: "VOLUNTEER",
    title: "Secretary",
    organization: "BU Brazilian Jiu Jitsu Club",
    platform: null,
    location: "Boston, MA",
    startDate: "2024-09",
    endDate: null,
    current: true,
    summary:
      "Overseeing club operations and planning events and training sessions as an elected officer.",
    highlights: ["Built a learning dashboard for club members"],
    skills: ["Operations", "Event Planning"],
  },
].map((entry, index) =>
  experienceSchema.parse({ ...entry, status: "PUBLISHED", sortOrder: index }),
);

assertUniqueSlugs(experience, "experience");
