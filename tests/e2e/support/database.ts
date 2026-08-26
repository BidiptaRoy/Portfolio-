import { readFileSync } from "node:fs";

import { parse as parseEnvFile } from "dotenv";

/**
 * Decides which database the e2e suite is allowed to touch, and refuses if the
 * answer is "the real one".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Why this is a whole module rather than three lines in the config
 * ─────────────────────────────────────────────────────────────────────────
 *
 * These tests sign in and create, publish, and delete real rows — that is the
 * point of them. As of Phase 10b there is ONE Neon database, shared by local
 * development and the Vercel project, so running them against `DATABASE_URL`
 * would write test fixtures into the live site's content. `/projects` reads
 * `searchParams` and is therefore dynamic rather than prerendered, so
 * production would actually serve them, and a run that crashed before its
 * cleanup would leave them there.
 *
 * That is a silent, public failure, so the check is deliberately built to hold
 * from more than one direction:
 *
 *   1. A separate variable name. Nothing reads `DATABASE_URL` here, so
 *      production cannot be reached by default or by forgetting something.
 *   2. A collision check. Catches the other direction — someone pasting the
 *      real string into `E2E_DATABASE_URL` to "just get it running".
 *
 * It is called from playwright.config.ts at module scope, which is the
 * earliest moment available: `globalSetup` runs AFTER `webServer` starts, so a
 * check there would already be too late to stop a build from connecting.
 */

export type TestDatabase = { url: string; directUrl: string };

/**
 * Set by playwright.config.ts on the server process it spawns, to record that
 * the collision check below has already run in the parent — see the comment at
 * the check itself for why the child cannot run it meaningfully.
 *
 * Exported rather than written as a literal in two places so that renaming it
 * cannot silently disconnect the two halves.
 */
export const GUARD_PASSED_MARKER = "E2E_DATABASE_GUARD_PASSED";

/** How a database is identified for the "is this the same one?" comparison. */
export function identify(connectionString: string): string {
  const url = new URL(connectionString);

  /*
    Neon hands out two strings for the SAME database: a pooled one whose host
    contains "-pooler" and a direct one without it. Comparing raw strings would
    call those two different databases and wave the pooled production URL
    straight through — which is exactly the mistake this exists to catch.

    Credentials and query parameters are dropped for the same reason: a
    different role, or a different `?sslmode=`, on the same host and database
    is still the same rows.
  */
  const host = url.hostname.replace("-pooler", "");
  return `${host}${url.port ? `:${url.port}` : ""}${url.pathname}`;
}

/** Reads .env.local without importing it into this process's environment. */
function readLocalEnv(): Record<string, string> {
  try {
    return parseEnvFile(readFileSync(".env.local", "utf8"));
  } catch {
    // No .env.local — the normal case in CI — means nothing to collide with.
    return {};
  }
}

export function resolveTestDatabase(): TestDatabase {
  /*
    Read .env.local ourselves. Next loads it automatically and the Prisma CLI is
    given it by prisma.config.ts, but nothing loads it for the Playwright
    config — which is evaluated by Playwright's own runner, long before any of
    those. Without this, connection strings sitting correctly in .env.local
    would read as unset and the suite would refuse to run while telling you to
    set variables you had already set.

    process.env still wins, so CI (which sets them directly and has no
    .env.local) is unaffected.
  */
  const local = readLocalEnv();
  const url = process.env.E2E_DATABASE_URL ?? local["E2E_DATABASE_URL"];

  if (!url) {
    throw new Error(
      [
        "",
        "E2E_DATABASE_URL is not set, so the e2e suite has nowhere safe to run.",
        "",
        "These tests sign in and create, publish and delete real rows. They must",
        "NOT run against DATABASE_URL: local development and the Vercel project",
        "currently share one Neon database, so that is the live site's content.",
        "",
        "Point it at a throwaway database instead. A Neon branch is easiest:",
        "  Neon console -> Branches -> New branch -> copy its connection strings.",
        "",
        "Then add to .env.local:",
        "  E2E_DATABASE_URL=postgresql://...   # pooled string for the branch",
        "  E2E_DIRECT_URL=postgresql://...     # direct string (no -pooler)",
        "",
      ].join("\n"),
    );
  }

  const directUrl = process.env.E2E_DIRECT_URL ?? local["E2E_DIRECT_URL"] ?? url;
  const production = local["DATABASE_URL"] ?? process.env.DATABASE_URL;

  /*
    ⚠ The ONE place the collision check is skipped, and the reason is that in
    this one place it would be comparing a value against itself.

    playwright.config.ts calls this function at module scope, against the real
    ambient environment, and then starts the server with DATABASE_URL set to
    the database this function just returned. prepare-database.ts runs as the
    first step of that server command and calls this function AGAIN, because it
    is also runnable on its own. Inside that child, DATABASE_URL and
    E2E_DATABASE_URL are the same string by construction — we set them — so the
    check below compares the e2e database with itself and refuses.

    This is what made every End-to-end run in CI fail from the Playwright commit
    (9916332) onwards, seven runs in a row, with:

        Error: Process from config.webServer was not able to start. Exit code: 1

    It was invisible locally because .env.local supplies a DATABASE_URL — the
    development branch — and that takes precedence on the line above, so the
    comparison was e2e-against-development and passed. CI has no .env.local,
    falls through to the injected value, and trips. Which is why the suite was
    green on every developer machine and red on every push.

    Nothing is weakened by skipping it here: the check has already run, in the
    parent, at the only moment when the ambient DATABASE_URL still named the
    real database. Defence #1 in the header — that nothing reads DATABASE_URL
    to decide where to write — is untouched and still holds on its own.
  */
  const alreadyChecked = process.env[GUARD_PASSED_MARKER] === "1";

  if (production && !alreadyChecked) {
    const target = identify(url);

    if (target === identify(production)) {
      throw new Error(
        [
          "",
          "E2E_DATABASE_URL points at the same database as DATABASE_URL.",
          "",
          `  both resolve to: ${target}`,
          "",
          "Refusing to run. This suite creates and PUBLISHES projects, and",
          "/projects is served dynamically, so they would appear on the live",
          "site - and stay there if a run crashes before its cleanup.",
          "",
          "Use a separate database. A Neon branch takes about ten seconds.",
          "",
        ].join("\n"),
      );
    }
  }

  return { url, directUrl };
}
