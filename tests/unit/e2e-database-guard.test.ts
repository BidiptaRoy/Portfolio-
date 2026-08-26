import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GUARD_PASSED_MARKER, identify, resolveTestDatabase } from "../e2e/support/database";

/**
 * The guard that decides which database the Playwright suite may write to.
 *
 * This is unit-tested rather than left to the e2e run itself for a reason worth
 * stating: the guard's own failure mode is that it behaves DIFFERENTLY on a
 * developer machine than in CI, so the e2e suite can never catch a bug in it.
 * It was green locally and red on all seven CI runs after it landed.
 *
 * The difference is `.env.local`. It exists locally and supplies a DATABASE_URL
 * (the development branch) which the guard prefers; CI has no such file and
 * falls through to `process.env.DATABASE_URL` — which, inside the server
 * Playwright starts, is the e2e database that Playwright itself just put there.
 * The guard then compared the e2e database with itself and refused.
 *
 * So every test here runs from an EMPTY working directory, which is what "no
 * .env.local" means to `readLocalEnv()`, and is therefore the CI shape.
 */

const E2E_URL = "postgresql://u:p@ep-example-pooler.us-east-1.aws.neon.tech/neondb";
const E2E_DIRECT = "postgresql://u:p@ep-example.us-east-1.aws.neon.tech/neondb";
const OTHER_URL = "postgresql://u:p@ep-somewhere-else.us-east-1.aws.neon.tech/neondb";

const MANAGED = [
  "E2E_DATABASE_URL",
  "E2E_DIRECT_URL",
  "DATABASE_URL",
  "DIRECT_URL",
  GUARD_PASSED_MARKER,
] as const;

describe("the e2e database guard, as CI sees it", () => {
  let cwd: string;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    cwd = process.cwd();
    saved = Object.fromEntries(MANAGED.map((key) => [key, process.env[key]]));
    for (const key of MANAGED) delete process.env[key];

    // No .env.local here, which is the whole point.
    process.chdir(mkdtempSync(join(tmpdir(), "e2e-guard-")));
  });

  afterEach(() => {
    process.chdir(cwd);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("refuses when E2E_DATABASE_URL is not set at all", () => {
    expect(() => resolveTestDatabase()).toThrow(/E2E_DATABASE_URL is not set/);
  });

  it("refuses when E2E_DATABASE_URL names the same database as DATABASE_URL", () => {
    process.env["E2E_DATABASE_URL"] = E2E_URL;
    process.env["DATABASE_URL"] = E2E_DIRECT; // same database, direct string

    expect(() => resolveTestDatabase()).toThrow(/points at the same database/);
  });

  it("allows a genuinely different database", () => {
    process.env["E2E_DATABASE_URL"] = E2E_URL;
    process.env["E2E_DIRECT_URL"] = E2E_DIRECT;
    process.env["DATABASE_URL"] = OTHER_URL;

    expect(resolveTestDatabase()).toEqual({ url: E2E_URL, directUrl: E2E_DIRECT });
  });

  /*
    The regression. playwright.config.ts sets DATABASE_URL to the e2e database
    for the server it starts, then prepare-database.ts re-runs this guard inside
    that server — so the two are identical by construction and the check above
    would refuse. The marker records that the check already ran in the parent.

    Seen to fail before it was trusted: without the marker handling, this test
    throws "points at the same database", which is precisely what CI reported as
    "Process from config.webServer was not able to start. Exit code: 1".
  */
  it("proceeds when the parent has already run the check", () => {
    process.env["E2E_DATABASE_URL"] = E2E_URL;
    process.env["E2E_DIRECT_URL"] = E2E_DIRECT;
    process.env["DATABASE_URL"] = E2E_URL;
    process.env[GUARD_PASSED_MARKER] = "1";

    expect(resolveTestDatabase()).toEqual({ url: E2E_URL, directUrl: E2E_DIRECT });
  });

  it("does not accept anything other than an exact marker value", () => {
    process.env["E2E_DATABASE_URL"] = E2E_URL;
    process.env["DATABASE_URL"] = E2E_URL;
    process.env[GUARD_PASSED_MARKER] = "true";

    expect(() => resolveTestDatabase()).toThrow(/points at the same database/);
  });
});

describe("identify", () => {
  it("treats Neon's pooled and direct strings as one database", () => {
    expect(identify(E2E_URL)).toBe(identify(E2E_DIRECT));
  });

  it("ignores credentials and query parameters", () => {
    expect(identify("postgresql://a:b@host.example/db?sslmode=require")).toBe(
      identify("postgresql://c:d@host.example/db?sslmode=verify-full"),
    );
  });

  it("still separates different hosts", () => {
    expect(identify(E2E_URL)).not.toBe(identify(OTHER_URL));
  });
});
