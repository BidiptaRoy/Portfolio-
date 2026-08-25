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
 * A screenshot or diagram on a project page.
 *
 * Uploaded through the admin, never seeded: `src/content/` is a text source
 * and there are no binary files in it. A fresh database therefore has
 * projects but no images, which is a supported state everywhere they render.
 */
export interface ProjectImage {
  id: string;
  url: string;
  /** Required, never optional — see the note on the Prisma model. */
  alt: string;
  caption: string | null;
  /**
   * Intrinsic size when it could be read from the file. Null is handled by
   * falling back to a default aspect ratio, never by guessing dimensions.
   */
  width: number | null;
  height: number | null;
  sortOrder: number;
}

/** A project together with its gallery. What the detail page renders. */
export type ProjectWithImages = Project & { images: ProjectImage[] };

/**
 * A project as it appears in a list, carrying only its first image.
 *
 * Distinct from `ProjectWithImages` so that listing seven projects does not
 * also load seven galleries to render seven thumbnails. `cover` is null both
 * when a project has no images and before any have been uploaded.
 */
export type ProjectSummary = Project & { cover: ProjectImage | null };

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

/**
 * A resume file. Versioned rather than overwritten so an older copy is never
 * lost, and so `status` can hold a revision back from the public site while
 * it is being corrected.
 */
export interface ResumeVersion extends ContentMeta {
  label: string;
  /** A path under /public, or a Blob URL for anything uploaded since Phase 9. */
  fileUrl: string;
  /**
   * The URL that saves the file instead of opening it, or null for a /public
   * file. `<a download>` does nothing cross-origin, so a Blob-hosted resume
   * needs this or the download button quietly stops downloading.
   */
  downloadUrl: string | null;
  /** Path within the Blob store; null for a /public file. */
  pathname: string | null;
  /** The filename a visitor's browser saves it as. */
  downloadName: string;
  /**
   * The month the resume itself was revised — distinct from the row's
   * `updatedAt` timestamp, which records when the record was last edited.
   * Conflating the two would show "updated this week" for a year-old PDF.
   */
  revisedAt: YearMonth;
  isCurrent: boolean;
}

export type SocialPlatform = "GITHUB" | "LINKEDIN" | "EMAIL";

export interface SocialLink extends ContentMeta {
  platform: SocialPlatform;
  label: string;
  url: string;
}

/**
 * A service offered directly to clients — Phase 12.
 *
 * Separate from `Experience` even though the Taskrabbit entry describes the
 * same work, because they answer different questions. An Experience entry is
 * a record of what Bidipta has done, addressed to recruiters; a Service is an
 * offer, addressed to someone deciding whether to hire him. Folding them
 * together would mean one page's content changing to suit the other's reader.
 */
export interface Service extends ContentMeta {
  slug: string;
  name: string;
  /** One line. Used on cards and in the page's list. */
  summary: string;
  /** Long form. The detail a client actually needs. */
  description: string;
  /** What the job includes. Empty is fine — the list is hidden when blank. */
  includes: string[];
  /** Where it is offered, e.g. "Boston, MA · Greater New York". */
  serviceArea: string | null;
  /**
   * Free text about how pricing works — NEVER a rate.
   *
   * Rates are quoted per task on the platform and change. A figure printed on
   * a public page is a promise to a stranger that nobody remembers making, and
   * it is exactly the kind of content the CMS exists to keep out of
   * components. Null until Bidipta writes one himself.
   */
  pricingNote: string | null;
}

/**
 * An outbound referral destination, stored as data — Phase 12.
 *
 * Every outbound Taskrabbit link points at `/r/[slug]` rather than at the
 * destination, so that adding click tracking later is one insert in one file
 * rather than an audit of every page for links someone forgot. That seam was
 * cut deliberately early; see docs/architecture.md.
 *
 * The promo code lives here for the same reason it is not in a component: a
 * promo code hard-coded into JSX is one that expires and needs a developer.
 */
export interface ReferralLink extends ContentMeta {
  slug: string;
  label: string;
  url: string;
  /** Shown alongside the link when present. */
  promoCode: string | null;
  description: string | null;
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
  /**
   * Portrait for the home page hero, or null.
   *
   * There is no accompanying alt text because a portrait's alt text is the
   * person's name — `profile.name`, two fields up. Storing it separately
   * would create a second place for the same fact to be wrong.
   */
  photoUrl: string | null;
}
