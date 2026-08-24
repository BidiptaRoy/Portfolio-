import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEducation } from "@/server/queries/education";
import {
  getCurrentExperience,
  getCurrentExperiences,
  getExperience,
  getExperienceByKind,
  getExperienceBySection,
} from "@/server/queries/experience";
import { getProfile, getSocialLinks } from "@/server/queries/profile";
import {
  getFeaturedProjects,
  getProjectBySlug,
  getProjects,
  getProjectSlugs,
  getProjectTechnologies,
} from "@/server/queries/projects";
import { getCurrentResume } from "@/server/queries/resume";
import { getSkills, getSkillsByCategory } from "@/server/queries/skills";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * THE READ FAÇADE — "public queries filter to PUBLISHED. Drafts must never
 * leave the server."
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Prisma is mocked, so these are not database tests: no schema, no rows, no
 * connection string. What they check is the half that is this codebase's own
 * to get wrong — the `where` clause each function sends, and the shaping it
 * does to the result afterwards.
 *
 * The draft filter is worth a test rather than a code review because losing
 * it fails silently and in the most expensive direction: an unfinished
 * project appears on a public page and nothing anywhere reports an error.
 */

const { prisma } = vi.hoisted(() => {
  const model = () => ({ findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() });

  return {
    prisma: {
      project: model(),
      experience: model(),
      education: model(),
      skill: model(),
      socialLink: model(),
      resumeVersion: model(),
      profile: model(),
    },
  };
});

vi.mock("@/lib/db", () => ({ prisma }));

const models = Object.values(prisma);

/** Every `where` this test run has sent, across every model. */
function everyWhere(): Record<string, unknown>[] {
  return models
    .flatMap((model) => [...model.findMany.mock.calls, ...model.findFirst.mock.calls])
    .map((call) => (call[0] as { where?: Record<string, unknown> }).where ?? {});
}

beforeEach(() => {
  for (const model of models) {
    // `mockReset` rather than `clearAllMocks`: the latter keeps queued
    // `…Once` values, so a fallback test that leaves one unconsumed would
    // hand it to the next test as its first result.
    model.findMany.mockReset();
    model.findFirst.mockReset();
    model.findUnique.mockReset();

    model.findMany.mockResolvedValue([]);
    model.findFirst.mockResolvedValue(null);
    model.findUnique.mockResolvedValue(null);
  }
});

describe("the PUBLISHED filter", () => {
  /*
    A sweep rather than one assertion per function: the point is that NO
    public read can reach the database without the filter, and a list of
    named cases only proves it about the cases someone remembered to add.
    A new public query with a missing filter fails here the first time it is
    listed below — and CLAUDE.md's convention is that it must be.
  */
  const publicReads: [name: string, run: () => Promise<unknown>][] = [
    ["getProjects", getProjects],
    ["getFeaturedProjects", getFeaturedProjects],
    ["getProjectBySlug", () => getProjectBySlug("ecoroute")],
    ["getProjectSlugs", getProjectSlugs],
    ["getProjectTechnologies", getProjectTechnologies],
    ["getExperience", getExperience],
    ["getExperienceByKind", () => getExperienceByKind("TECHNICAL")],
    ["getExperienceBySection", getExperienceBySection],
    ["getCurrentExperience", getCurrentExperience],
    ["getCurrentExperiences", getCurrentExperiences],
    ["getEducation", getEducation],
    ["getSkills", getSkills],
    ["getSkillsByCategory", getSkillsByCategory],
    ["getSocialLinks", getSocialLinks],
    ["getCurrentResume", getCurrentResume],
  ];

  it.each(publicReads)("%s never queries without it", async (_name, run) => {
    await run();

    const wheres = everyWhere();
    expect(wheres.length).toBeGreaterThan(0);

    for (const where of wheres) {
      expect(where.status).toBe("PUBLISHED");
    }
  });

  it("covers every exported function in the public façade", async () => {
    /*
      The sweep above is only as good as its list, so the list is checked
      against the modules themselves. A new export shows up here as a
      failure naming it, rather than as a query nobody tested.

      `admin.ts` is excluded deliberately — it is the one façade file whose
      reads INCLUDE drafts, which is why it lives under a filename a public
      page importing it would look wrong.
    */
    const facades = await Promise.all([
      import("@/server/queries/projects"),
      import("@/server/queries/experience"),
      import("@/server/queries/education"),
      import("@/server/queries/skills"),
      import("@/server/queries/profile"),
      import("@/server/queries/resume"),
    ]);

    const exported = facades
      .flatMap((module) => Object.entries(module))
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort();

    const tested = [...publicReads.map(([name]) => name), "getProfile"].sort();

    expect(exported).toEqual(tested);
  });
});

describe("getProjects", () => {
  it("flattens the one-element image relation into a single cover", async () => {
    // Prisma returns a relation as an array whatever the `take`, and no
    // component should have to know that a cover arrives as a list.
    prisma.project.findMany.mockResolvedValue([
      { slug: "a", title: "A", images: [{ id: "i1", url: "https://x/a.png" }] },
      { slug: "b", title: "B", images: [] },
    ]);

    const projects = await getProjects();

    expect(projects[0]).toMatchObject({ slug: "a", cover: { id: "i1" } });
    expect(projects[1]).toMatchObject({ slug: "b", cover: null });
    // The raw relation must not survive into the domain shape.
    expect(projects[0]).not.toHaveProperty("images");
  });

  it("orders by sortOrder and takes only the first image as a cover", async () => {
    await getProjects();

    const args = prisma.project.findMany.mock.calls[0]?.[0] as {
      orderBy: unknown;
      select: { images: { take: number; orderBy: unknown } };
    };

    expect(args.orderBy).toEqual({ sortOrder: "asc" });
    expect(args.select.images.take).toBe(1);
    expect(args.select.images.orderBy).toEqual({ sortOrder: "asc" });
  });
});

describe("getFeaturedProjects", () => {
  it("filters to featured, and applies a limit only when given one", async () => {
    await getFeaturedProjects();
    expect(prisma.project.findMany.mock.calls[0]?.[0]).not.toHaveProperty("take");

    await getFeaturedProjects(3);
    expect(prisma.project.findMany.mock.calls[1]?.[0]).toMatchObject({
      where: { status: "PUBLISHED", featured: true },
      take: 3,
    });
  });
});

describe("getProjectTechnologies", () => {
  it("deduplicates across projects and sorts the result", async () => {
    prisma.project.findMany.mockResolvedValue([
      { tech: ["Python", "Next.js"] },
      { tech: ["Next.js", "SQLite"] },
      { tech: [] },
    ]);

    await expect(getProjectTechnologies()).resolves.toEqual(["Next.js", "Python", "SQLite"]);
  });
});

describe("getCurrentExperience", () => {
  it("prefers a current technical role", async () => {
    /*
      Several roles can be current at once — a term-time internship, a
      seasonal coaching job and an elected club office can all be live in
      the same month. Technical work is what the home page's audience is
      here for.
    */
    prisma.experience.findFirst.mockResolvedValue({ slug: "internship", kind: "TECHNICAL" });

    await expect(getCurrentExperience()).resolves.toMatchObject({ kind: "TECHNICAL" });
    expect(prisma.experience.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.experience.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { status: "PUBLISHED", current: true, kind: "TECHNICAL" },
    });
  });

  it("falls back to any current role when none is technical", async () => {
    prisma.experience.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ slug: "coaching", kind: "PROFESSIONAL" });

    await expect(getCurrentExperience()).resolves.toMatchObject({ slug: "coaching" });
    // The second query drops the kind but keeps `current` and the filter.
    expect(prisma.experience.findFirst.mock.calls[1]?.[0]).toMatchObject({
      where: { status: "PUBLISHED", current: true },
    });
  });

  it("returns null when nothing is current", async () => {
    await expect(getCurrentExperience()).resolves.toBeNull();
  });
});

describe("getExperienceBySection", () => {
  it("splits one query into the three sections", async () => {
    prisma.experience.findMany.mockResolvedValue([
      { slug: "a", kind: "TECHNICAL" },
      { slug: "b", kind: "LEADERSHIP" },
      { slug: "c", kind: "TECHNICAL" },
    ]);

    const sections = await getExperienceBySection();

    // One database round trip, not three.
    expect(prisma.experience.findMany).toHaveBeenCalledTimes(1);
    expect(sections.technical.map((entry) => entry.slug)).toEqual(["a", "c"]);
    expect(sections.leadership.map((entry) => entry.slug)).toEqual(["b"]);
    // An empty section is an empty array — the page omits it rather than
    // rendering a bare heading.
    expect(sections.professional).toEqual([]);
  });
});

describe("getSkillsByCategory", () => {
  it("groups in a fixed order and drops empty categories", async () => {
    prisma.skill.findMany.mockResolvedValue([
      { name: "Vercel", category: "TOOL" },
      { name: "Python", category: "LANGUAGE" },
      { name: "Next.js", category: "FRAMEWORK" },
    ]);

    const groups = await getSkillsByCategory();

    // Fixed category order, not the order rows came back in.
    expect(groups.map((group) => group.category)).toEqual(["LANGUAGE", "FRAMEWORK", "TOOL"]);
    expect(groups[0]?.label).toBe("Languages");
  });
});

describe("getCurrentResume", () => {
  it("returns the revision marked current", async () => {
    prisma.resumeVersion.findFirst.mockResolvedValue({ label: "April 2026", isCurrent: true });

    await expect(getCurrentResume()).resolves.toMatchObject({ label: "April 2026" });
    expect(prisma.resumeVersion.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { status: "PUBLISHED", isCurrent: true },
    });
  });

  it("falls back to the first published revision when none is marked current", async () => {
    // A forgotten `isCurrent` flag should degrade to an older resume, not
    // to no resume at all.
    prisma.resumeVersion.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ label: "January 2026" });

    await expect(getCurrentResume()).resolves.toMatchObject({ label: "January 2026" });
  });

  it("returns null when every revision is a draft", async () => {
    // A supported state: the Resume page renders without a download link.
    await expect(getCurrentResume()).resolves.toBeNull();
  });
});

describe("getProfile", () => {
  it("returns the singleton", async () => {
    prisma.profile.findUnique.mockResolvedValue({ name: "Bidipta Roy" });

    await expect(getProfile()).resolves.toMatchObject({ name: "Bidipta Roy" });
    expect(prisma.profile.findUnique.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "singleton" },
    });
  });

  it("throws an actionable error when the database was never seeded", async () => {
    // Every page depends on this row, so a nameless hero is a worse failure
    // than an exception naming the command that fixes it.
    await expect(getProfile()).rejects.toThrow(/db:seed/);
  });

  it("selects no internal columns", async () => {
    // Explicit selects are what keep the result structurally equal to the
    // domain type — and keep a component from depending on an id.
    prisma.profile.findUnique.mockResolvedValue({ name: "Bidipta Roy" });
    await getProfile();

    const args = prisma.profile.findUnique.mock.calls[0]?.[0] as {
      select: Record<string, boolean>;
    };

    expect(Object.keys(args.select)).not.toContain("id");
    expect(Object.keys(args.select)).not.toContain("updatedAt");
  });
});
