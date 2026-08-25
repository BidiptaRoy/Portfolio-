import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { education } from "@/content/education";
import { experience } from "@/content/experience";
import { profile, socialLinks } from "@/content/profile";
import { projects } from "@/content/projects";
import { referralLinks } from "@/content/referral-links";
import { resumeVersions } from "@/content/resume";
import { services } from "@/content/services";
import { skills } from "@/content/skills";
import {
  assertUniqueSlugs,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  referralLinkSchema,
  resumeVersionSchema,
  serviceSchema,
  skillSchema,
  socialLinkSchema,
} from "@/lib/validation/content";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * THE TEST THIS PHASE EXISTS FOR.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Content schemas run at MODULE IMPORT, which means they only fire for a
 * collection some rendered page actually reaches. A collection nothing
 * imports is never evaluated and therefore never validated — proven during
 * Phase 3 by planting a duplicate slug in education.ts and watching the
 * build pass green.
 *
 * The import list at the top of this file is the fix. Importing every
 * collection unconditionally runs every parse unconditionally, so a bad
 * entry fails here whatever the pages happen to render. Add a collection to
 * src/content and it belongs in that list the same day.
 *
 * Since these modules parse themselves on import, a malformed entry throws
 * before a single assertion runs — a collection failure shows up as this
 * file failing to load, not as a failed expect.
 */
describe("content collections", () => {
  it("every collection is imported here", () => {
    // Guards the gap above from reopening quietly: a new file in
    // src/content that nobody imports is invisible to every other test,
    // which is precisely the condition that let a duplicate slug ship.
    const directory = fileURLToPath(new URL("../../src/content", import.meta.url));
    const imported = [
      "education",
      "experience",
      "profile",
      "projects",
      "referral-links",
      "resume",
      "services",
      "skills",
    ];

    const onDisk = readdirSync(directory)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => file.replace(/\.ts$/, ""))
      .sort();

    expect(onDisk).toEqual([...imported].sort());
  });

  it("parses every project", () => {
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) expect(() => projectSchema.parse(project)).not.toThrow();
  });

  it("parses every experience entry", () => {
    expect(experience.length).toBeGreaterThan(0);
    for (const entry of experience) expect(() => experienceSchema.parse(entry)).not.toThrow();
  });

  it("parses every education entry", () => {
    expect(education.length).toBeGreaterThan(0);
    for (const entry of education) expect(() => educationSchema.parse(entry)).not.toThrow();
  });

  it("parses every skill", () => {
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) expect(() => skillSchema.parse(skill)).not.toThrow();
  });

  it("parses every resume version", () => {
    for (const version of resumeVersions) {
      expect(() => resumeVersionSchema.parse(version)).not.toThrow();
    }
  });

  it("parses the profile and its social links", () => {
    expect(() => profileSchema.parse(profile)).not.toThrow();
    for (const link of socialLinks) expect(() => socialLinkSchema.parse(link)).not.toThrow();
  });

  it("parses every service", () => {
    expect(services.length).toBeGreaterThan(0);
    for (const service of services) expect(() => serviceSchema.parse(service)).not.toThrow();
  });

  it("parses every referral link", () => {
    expect(referralLinks.length).toBeGreaterThan(0);
    for (const link of referralLinks) expect(() => referralLinkSchema.parse(link)).not.toThrow();
  });

  it("keeps slugs unique within each collection", () => {
    // Two entries sharing a slug share a URL, and `getBySlug` silently
    // returns whichever sorts first.
    expect(() => assertUniqueSlugs(projects, "project")).not.toThrow();
    expect(() => assertUniqueSlugs(experience, "experience")).not.toThrow();
    expect(() => assertUniqueSlugs(education, "education")).not.toThrow();
    expect(() => assertUniqueSlugs(services, "service")).not.toThrow();
    expect(() => assertUniqueSlugs(referralLinks, "referral link")).not.toThrow();
  });

  it("quotes no rate anywhere in the services content", () => {
    /*
      Pricing is quoted per task on the platform and changes. A figure printed
      on a public page is a promise to a stranger that nobody remembers
      making — and unlike a stale project description, it is the kind of
      mistake a client can hold you to.

      The Service model has no `price` column for this reason, so the only way
      a rate reaches the page is by being written into prose. This catches
      that. If a real rate is ever offered deliberately, it belongs in a field
      with a currency and a review, not in a sentence.
    */
    const currency = /(\$|USD|\bper hour\b|\/hr\b|\bhourly rate\b)/i;

    for (const service of services) {
      const prose = [service.summary, service.description, service.pricingNote ?? ""].join(" ");
      expect(prose, `${service.slug} must not quote a rate`).not.toMatch(currency);
    }
  });

  it("names no more than one resume version as current", () => {
    // `getCurrentResume` takes the first match by sortOrder, so a second
    // current revision would not error — it would quietly serve the wrong
    // PDF, which is worse.
    const current = resumeVersions.filter((version) => version.isCurrent);
    expect(current.length).toBeLessThanOrEqual(1);
  });

  it("records Taskrabbit as a platform, never as an employer", () => {
    /*
      The one content rule in CLAUDE.md marked non-negotiable. It is a data
      rule, not a copy rule: the page renders "via {platform}" only when the
      platform field is set, so writing "Taskrabbit" into `organization`
      would render it as an employer with no error anywhere.
    */
    for (const entry of experience) {
      // `organization` is null on a platform engagement, which is the point.
      expect(entry.organization ?? "").not.toMatch(/taskrabbit/i);

      if (entry.platform?.toLowerCase() === "taskrabbit") {
        expect(entry.engagementType).toBe("PLATFORM_ENGAGEMENT");
        expect(entry.organization).toBeNull();
      }
    }
  });
});

describe("assertUniqueSlugs", () => {
  it("throws on a duplicate, naming the slug", () => {
    // The exact failure that shipped green in Phase 3.
    expect(() =>
      assertUniqueSlugs([{ slug: "a" }, { slug: "b" }, { slug: "a" }], "education"),
    ).toThrow(/Duplicate education slug: "a"/);
  });

  it("returns the collection unchanged when slugs are unique", () => {
    const items = [{ slug: "a" }, { slug: "b" }];
    expect(assertUniqueSlugs(items, "project")).toBe(items);
  });
});
