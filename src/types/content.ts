/**
 * The domain model for every piece of portfolio content.
 *
 * These types are the contract. Today they describe TypeScript modules in
 * `src/content/`; in Phase 6 the Prisma models implement the same shapes and
 * the content modules become the input to `prisma/seed.ts`. Keeping them
 * honest now is what makes that migration a no-op for components.
 *
 * See docs/content-model.md and docs/decisions/0004.
 */

/** Public queries filter to PUBLISHED. Drafts never leave the server. */
export type PublishStatus = "DRAFT" | "PUBLISHED";

/**
 * A year, optionally narrowed to a month: "2025" or "2025-11".
 *
 * Deliberately permits year-only. Forcing a month would mean inventing
 * precision that does not exist for older work, and a wrong date is worse
 * than a vague one on a page recruiters read closely.
 */
export type YearMonth = string;

/** Fields every content entity carries. The backbone of the future CMS. */
export interface ContentMeta {
  status: PublishStatus;
  /** Ascending. Lower sorts first. */
  sortOrder: number;
}

export interface Project extends ContentMeta {
  slug: string;
  title: string;
  /** One line. Used on cards and in search results. */
  summary: string;
  /** Long form, Markdown. Rendered on the detail page. */
  description: string;
  /** What Bidipta specifically did. */
  role: string | null;
  featured: boolean;
  startedAt: YearMonth | null;
  completedAt: YearMonth | null;
  /** Display names for now; becomes a Tag relation in Phase 6. */
  tech: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  /** Concrete results. Empty until real ones exist — never fill with filler. */
  outcomes: string[];
  /** Problems actually hit and how they were solved. Same rule. */
  challenges: string[];
}

/**
 * Which section of the Experience page an entry belongs to.
 * Drives grouping only; every kind gets identical visual treatment.
 *
 * LEADERSHIP mirrors the "Activities and Leadership" section of Bidipta's
 * resume. It exists so an elected club office is not filed as employment,
 * which would be inaccurate in both directions — it overstates the working
 * relationship and understates the responsibility.
 */
export type ExperienceKind = "TECHNICAL" | "PROFESSIONAL" | "LEADERSHIP";

/**
 * The nature of the working relationship.
 *
 * PLATFORM_ENGAGEMENT exists so that work found through a marketplace is
 * described accurately. See `platform` below.
 */
export type EngagementType =
  "INTERNSHIP" | "EMPLOYMENT" | "CONTRACT" | "PLATFORM_ENGAGEMENT" | "VOLUNTEER" | "MEMBERSHIP";

export interface Experience extends ContentMeta {
  slug: string;
  kind: ExperienceKind;
  engagementType: EngagementType;
  title: string;
  /** The actual employer, client, or organization. */
  organization: string | null;
  /**
   * The marketplace the work was found through — e.g. "Taskrabbit".
   * Rendered as "via Taskrabbit", NEVER as an employer. A platform is a
   * channel, not the entity you worked for. This separation is the reason
   * the field exists at all rather than being folded into `organization`.
   */
  platform: string | null;
  location: string | null;
  startDate: YearMonth;
  /** null when `current` is true. */
  endDate: YearMonth | null;
  current: boolean;
  summary: string;
  highlights: string[];
  skills: string[];
}

export interface Education extends ContentMeta {
  slug: string;
  institution: string;
  degree: string;
  field: string;
  location: string | null;
  startDate: YearMonth;
  endDate: YearMonth | null;
  expected: boolean;
  highlights: string[];
}

export type SkillCategory = "LANGUAGE" | "FRAMEWORK" | "DATABASE" | "TOOL" | "PRACTICE";

export interface Skill extends ContentMeta {
  name: string;
  category: SkillCategory;
}

export type SocialPlatform = "GITHUB" | "LINKEDIN" | "EMAIL";

export interface SocialLink extends ContentMeta {
  platform: SocialPlatform;
  label: string;
  url: string;
}

export interface Profile {
  name: string;
  headline: string;
  /** One or two sentences. Hero and meta description. */
  shortBio: string;
  /** Paragraphs, rendered in order on About. */
  longBio: string[];
  location: string;
  email: string;
  availability: string | null;
}
