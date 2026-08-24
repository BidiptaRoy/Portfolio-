import { describe, expect, it } from "vitest";

import {
  contactFormSchema,
  educationFormSchema,
  experienceFormSchema,
  normalizeYearMonth,
  profileFormSchema,
  projectFormSchema,
  resumeFormSchema,
  toFieldErrors,
} from "@/lib/validation/forms";

/**
 * Server-side form validation — the check that actually runs, as opposed to
 * whatever the browser did before submitting.
 */

describe("normalizeYearMonth", () => {
  /*
    The rule from CLAUDE.md: "be liberal in what date input you accept.
    Rejecting a reasonable format is a bug." An earlier version took only
    the canonical form and cost a real edit, so each of these is a
    regression guard rather than a hypothetical.
  */
  it.each([
    ["2025", "2025"],
    ["2025-06", "2025-06"],
    ["2025-6", "2025-06"],
    ["2025/6", "2025-06"],
    ["2025.06", "2025-06"],
    ["2025 6", "2025-06"],
    ["6/2025", "2025-06"],
    ["06-2025", "2025-06"],
    ["12/2025", "2025-12"],
    ["June 2025", "2025-06"],
    ["june 2025", "2025-06"],
    ["Jun 2025", "2025-06"],
    ["Jun. 2025", "2025-06"],
    ["Sept 2025", "2025-09"],
    ["2025 June", "2025-06"],
    ["  2025-06  ", "2025-06"],
  ])("reads %j as %j", (input, expected) => {
    expect(normalizeYearMonth(input)).toBe(expected);
  });

  it.each(["", "   ", "\n"])("treats %j as not set", (input) => {
    expect(normalizeYearMonth(input)).toBeNull();
  });

  it.each([
    "2025-13", // no such month
    "2025-0",
    "0/2025",
    "13/2025",
    "20255",
    "Juneuary 2025",
    "next year",
    "2025-06-15", // a full date is not a year-month
  ])("refuses %j as unreadable", (input) => {
    expect(normalizeYearMonth(input)).toBe(false);
  });

  it("distinguishes 'not set' from 'unreadable'", () => {
    // The two are handled differently downstream — null clears the field,
    // false is a validation error — so `== false` here would be a bug.
    expect(normalizeYearMonth("")).not.toBe(false);
    expect(normalizeYearMonth("nonsense")).not.toBeNull();
  });
});

describe("projectFormSchema", () => {
  const valid = {
    slug: "eco-route",
    title: "EcoRoute",
    summary: "A dashboard.",
    description: "A longer description.",
    role: "",
    startedAt: "",
    completedAt: "2026-2",
    tech: "Next.js\n\n  SQLite  \n",
    repoUrl: "",
    liveUrl: "https://example.com",
    outcomes: "",
    challenges: "",
    status: "PUBLISHED",
    sortOrder: "3",
  };

  it("transforms raw form strings into the domain shape", () => {
    const parsed = projectFormSchema.parse(valid);

    expect(parsed).toMatchObject({
      slug: "eco-route",
      // An empty optional text field means "not set", not "".
      role: null,
      startedAt: null,
      completedAt: "2026-02",
      // A textarea of one item per line, trimmed, with blanks dropped.
      tech: ["Next.js", "SQLite"],
      outcomes: [],
      repoUrl: null,
      liveUrl: "https://example.com",
      sortOrder: 3,
    });
  });

  it("treats an absent checkbox as false and 'on' as true", () => {
    // An unchecked checkbox is absent from FormData entirely — not "off".
    expect(projectFormSchema.parse(valid).featured).toBe(false);
    expect(projectFormSchema.parse({ ...valid, featured: "on" }).featured).toBe(true);
  });

  it.each(["Eco Route", "EcoRoute", "eco_route", "eco--route", "-eco", ""])(
    "rejects %j as a slug",
    (slug) => {
      expect(projectFormSchema.safeParse({ ...valid, slug }).success).toBe(false);
    },
  );

  it("rejects a URL that is not a URL", () => {
    const result = projectFormSchema.safeParse({ ...valid, liveUrl: "example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an unreadable date with a message that suggests a format", () => {
    const result = projectFormSchema.safeParse({ ...valid, completedAt: "sometime" });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(toFieldErrors(result.error).completedAt?.[0]).toMatch(/2025-06|June 2025/);
    }
  });
});

describe("experienceFormSchema", () => {
  const valid = {
    slug: "some-role",
    kind: "TECHNICAL",
    engagementType: "INTERNSHIP",
    title: "Engineer",
    organization: "Somewhere",
    platform: "",
    location: "Boston, MA",
    startDate: "2025-06",
    endDate: "2025-08",
    summary: "Did the work.",
    highlights: "",
    skills: "",
    status: "PUBLISHED",
    sortOrder: "0",
  };

  it("accepts a finished role with an end date", () => {
    expect(experienceFormSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a current role with no end date", () => {
    const result = experienceFormSchema.safeParse({ ...valid, current: "on", endDate: "" });
    expect(result.success).toBe(true);
  });

  it("refuses a role that is both current and finished", () => {
    /*
      Without this rule a stale end date left behind when a role is marked
      current renders as "May 2026 – Aug 2026 · Present".
    */
    const result = experienceFormSchema.safeParse({ ...valid, current: "on" });
    expect(result.success).toBe(false);

    if (!result.success) {
      // Reported against endDate, so FormShell focuses the field that is wrong.
      expect(toFieldErrors(result.error).endDate).toBeDefined();
    }
  });

  it("refuses a finished role with no end date", () => {
    const result = experienceFormSchema.safeParse({ ...valid, endDate: "" });
    expect(result.success).toBe(false);
  });

  it("requires a start date", () => {
    expect(experienceFormSchema.safeParse({ ...valid, startDate: "" }).success).toBe(false);
  });
});

describe("educationFormSchema", () => {
  it("requires a start date but not an end date", () => {
    const base = {
      slug: "bu",
      institution: "Boston University",
      degree: "Bachelor's degree",
      field: "Computer Science",
      location: "Boston, MA",
      startDate: "September 2023",
      highlights: "",
      status: "PUBLISHED",
      sortOrder: "0",
    };

    const parsed = educationFormSchema.parse({ ...base, endDate: "" });
    expect(parsed.startDate).toBe("2023-09");
    expect(parsed.endDate).toBeNull();

    expect(educationFormSchema.safeParse({ ...base, startDate: "", endDate: "" }).success).toBe(
      false,
    );
  });
});

describe("resumeFormSchema", () => {
  const valid = {
    label: "April 2026",
    downloadName: "Bidipta-Roy-Resume.pdf",
    revisedAt: "2026-04",
    status: "PUBLISHED",
  };

  it("accepts a plain PDF filename", () => {
    expect(resumeFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    "resume", // no extension
    "resume.exe",
    "my resume.pdf", // a space
    "nested/resume.pdf", // becomes a folder in the store, silently
    "../resume.pdf",
    "",
  ])("rejects %j as a download name", (downloadName) => {
    expect(resumeFormSchema.safeParse({ ...valid, downloadName }).success).toBe(false);
  });
});

describe("profileFormSchema", () => {
  const valid = {
    name: "Bidipta Roy",
    headline: "Computer Science student",
    shortBio: "Short.",
    longBio: "First paragraph.\n\n  \n\nSecond paragraph.\n",
    location: "Boston, MA",
    email: "someone@example.com",
    availability: "",
  };

  it("splits the long bio on blank lines, dropping empty blocks", () => {
    expect(profileFormSchema.parse(valid).longBio).toEqual([
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("requires at least one paragraph", () => {
    expect(profileFormSchema.safeParse({ ...valid, longBio: "  \n\n  " }).success).toBe(false);
  });

  it("requires a valid email", () => {
    expect(profileFormSchema.safeParse({ ...valid, email: "someone@" }).success).toBe(false);
  });
});

describe("contactFormSchema", () => {
  /*
    The only schema in the codebase parsing input from someone who is not
    the admin, which is why every field here is length-capped: an unbounded
    string is a free way to write megabytes into the database.
  */
  const valid = {
    name: "A Visitor",
    email: "visitor@example.com",
    subject: "Hello",
    message: "This is a message long enough to pass the minimum.",
  };

  it("accepts a genuine message", () => {
    const parsed = contactFormSchema.parse(valid);
    expect(parsed.subject).toBe("Hello");
    expect(parsed.message).toContain("long enough");
  });

  it("treats an empty subject as not set", () => {
    expect(contactFormSchema.parse({ ...valid, subject: "   " }).subject).toBeNull();
  });

  const rejected: [label: string, override: Record<string, string>][] = [
    ["a message under ten characters", { message: "too short" }],
    ["an over-long message", { message: "x".repeat(5001) }],
    ["an over-long name", { name: "x".repeat(121) }],
    ["an over-long subject", { subject: "x".repeat(161) }],
    ["an over-long email", { email: `${"x".repeat(200)}@example.com` }],
    ["a malformed email", { email: "not-an-email" }],
    ["a missing name", { name: "   " }],
  ];

  it.each(rejected)("rejects %s", (_label, override) => {
    expect(contactFormSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it("accepts a message at exactly the cap and rejects one byte more", () => {
    expect(contactFormSchema.safeParse({ ...valid, message: "x".repeat(5000) }).success).toBe(true);
    expect(contactFormSchema.safeParse({ ...valid, message: "x".repeat(5001) }).success).toBe(
      false,
    );
  });

  it("ignores extra fields rather than failing on them", () => {
    // The action parses `Object.fromEntries(formData)`, which carries the
    // honeypot, the render timestamp, and React's own action fields. A
    // strict schema here would reject every real submission.
    const result = contactFormSchema.safeParse({
      ...valid,
      website: "",
      renderedAt: "1750000000000",
      $ACTION_ID_abc: "",
    });

    expect(result.success).toBe(true);
  });
});

describe("toFieldErrors", () => {
  it("files a schema-level issue under 'form'", () => {
    // FormShell renders `fieldErrors.form` as the banner; an issue with no
    // path would otherwise be dropped and the save would look successful.
    expect(toFieldErrors({ issues: [{ path: [], message: "Something is wrong" }] })).toEqual({
      form: ["Something is wrong"],
    });
  });

  it("joins a nested path with dots", () => {
    expect(
      toFieldErrors({ issues: [{ path: ["images", 0, "alt"], message: "Required" }] }),
    ).toEqual({ "images.0.alt": ["Required"] });
  });

  it("collects multiple issues on one field", () => {
    const errors = toFieldErrors({
      issues: [
        { path: ["email"], message: "Required" },
        { path: ["email"], message: "Must be an email" },
      ],
    });

    expect(errors.email).toEqual(["Required", "Must be an email"]);
  });
});
