import { defineConfig, devices } from "@playwright/test";

import { GUARD_PASSED_MARKER, resolveTestDatabase } from "./tests/e2e/support/database";

/**
 * End-to-end tests. The half of this application that unit tests cannot reach.
 *
 * Everything in `tests/unit` exercises server-side logic directly — validation,
 * the storage façade's byte checks, the read façade's PUBLISHED filter. None of
 * it renders a page, because nearly every page here is an async Server
 * Component and Vitest cannot render one (see docs/decisions/0009). That left
 * the admin screens covered by nothing but manual use, which docs/roadmap.md
 * calls the largest remaining test gap. This closes it.
 *
 * ⚠ These tests write to a real database, and which one is the most dangerous
 * setting in this file. See tests/e2e/support/database.ts for the full reason
 * and the guard — the short version is that local development and production
 * currently share one Neon database, so `DATABASE_URL` is the live site's
 * content and is never what these tests use.
 */

/*
  Called here, at module scope, rather than from `globalSetup`. Playwright
  starts `webServer` BEFORE running `globalSetup`, so a check there runs after
  the build has already connected to a database — too late to be a guard.
  Config evaluation is the earliest point available, and throwing here stops
  the run before Playwright spawns anything at all.
*/
const database = resolveTestDatabase();

/**
 * Not 3000, so a `npm run dev` you forgot about cannot be mistaken for the
 * server under test — `reuseExistingServer` would happily attach to it, and
 * the whole suite would then run against your development database with none
 * of the checks above applying.
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",

  /*
    Only the spec files. Without this, Playwright's default pattern would try
    to collect `prepare-database.ts` and the helpers under `support/` as tests
    and fail the run for finding no tests in them.
  */
  testMatch: /.*\.spec\.ts$/,

  /*
    One worker, always. Every test signs in as the same single admin account —
    there is exactly one by design, and no registration path to make a second
    (docs/decisions/0003) — and they write to shared tables. Run in parallel
    they interleave, and a suite that fails depending on scheduling teaches you
    to ignore it. This suite is small and the server is local; the wall-clock
    cost is seconds and the determinism is worth far more.
  */
  workers: 1,
  fullyParallel: false,

  // A `.only` left in a committed file would silently skip everything else, so
  // in CI that is a failure rather than a very fast green run.
  forbidOnly: Boolean(process.env.CI),

  /*
    No retries, deliberately, even in CI. Retries hide flakiness, and flakiness
    in a suite this small is a real bug — most likely a missing await on a
    revalidation. If something here fails intermittently, fix it rather than
    letting it re-roll.
  */
  retries: 0,

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    // Kept only for failures. A trace per test is large and nobody reads the
    // passing ones.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    /*
      Firefox and WebKit are deliberately absent. The Playwright guide runs all
      three, which is right for a public product; what these tests cover is an
      admin CMS used by one person, plus a handful of public-page assertions.
      Three engines would triple CI time to re-check form posts and redirects
      that do not vary by engine.

      Cross-browser rendering of the PUBLIC site is a real concern — but it is
      a visual one, and the Lighthouse and axe passes still outstanding in
      Phase 10b are the right tools for it, not this.
    */
  ],

  webServer: {
    /*
      A production build, not `next dev`. The Playwright guide recommends it and
      here it is closer to mandatory: this site is built around prerendering,
      `revalidatePath` is what makes an admin edit show up publicly, and neither
      behaves in dev the way it behaves in production. Testing the dev server
      would test something this project never deploys.

      The script's first step migrates and seeds the test database — before the
      build, because the build prerenders public pages from it.
    */
    command: `npm run e2e:server`,
    url: BASE_URL,
    // A cold Next build on Windows is not fast, and the default 60s expires
    // during the build rather than during a test, which reads like a broken
    // suite rather than a slow machine.
    timeout: 5 * 60 * 1000,
    // Locally, attach to a server you already started to iterate on tests
    // without rebuilding. Never in CI, where a leftover process would mean
    // testing something other than this commit.
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",

    env: {
      /*
        The test database, never DATABASE_URL — already proven above to be set
        and to be a different database from the live one.

        These win over `.env.local`: Next loads that through @next/env, which
        does not overwrite a variable already present in the environment.
      */
      DATABASE_URL: database.url,
      DIRECT_URL: database.directUrl,

      /*
        Records that the "is this the live database?" check has already run,
        just above, against the real ambient environment.

        prepare-database.ts calls resolveTestDatabase() again inside this
        server command, and the two lines above have just made DATABASE_URL and
        E2E_DATABASE_URL identical for it — so without this marker that second
        call compares the e2e database against itself and refuses to start. It
        did exactly that on every CI run, where there is no .env.local to
        supply a different DATABASE_URL and mask it. Full account in
        tests/e2e/support/database.ts.
      */
      [GUARD_PASSED_MARKER]: "1",

      /*
        ⚠ Required, and its absence is a genuinely confusing failure. Auth.js
        infers its own URL from Vercel-specific variables that do not exist
        locally, so without this EVERY /api/auth/* request from `next start`
        answers 500 with `UntrustedHost: Host must be trusted` — and since
        `next dev` is unaffected, it looks like the tests broke rather than the
        configuration. Already flagged in .env.example; this is that note
        applied.
      */
      AUTH_URL: BASE_URL,

      /*
        A fixed, throwaway secret rather than the real one. No session issued
        here is ever presented to a deployment, and pinning it means a run does
        not invalidate the sessions in your browser, as borrowing the real
        AUTH_SECRET would.
      */
      AUTH_SECRET: "e2e-only-not-a-real-secret-do-not-reuse",

      NEXT_PUBLIC_SITE_URL: BASE_URL,
    },
  },
});
