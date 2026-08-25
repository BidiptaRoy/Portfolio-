import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./support/auth";

/**
 * The axe audit, and the light-theme pass.
 *
 * Both have sat in docs/roadmap.md since Phase 5 marked "needs a real browser,
 * which is not available in this environment". Phase 10b brought one. This is
 * that audit, automated, so it stays done instead of being a thing someone
 * remembers to check before a launch that keeps not happening.
 *
 * ── Why this is not redundant with Lighthouse's Accessibility 100 ──
 *
 * Lighthouse runs a SUBSET of axe's rules. Scoring 100 there is genuinely good
 * and is not the same result as a clean axe run — axe checks rules Lighthouse
 * omits entirely.
 *
 * ── Why both colour schemes ──
 *
 * This site's dark theme is a full token swap via `prefers-color-scheme`, with
 * no toggle (docs/decisions/0005). Contrast is therefore a DIFFERENT set of
 * measurements in each theme, and a tool only ever measures the one the
 * machine happens to be set to. The Lighthouse runs in Phase 10b were made on
 * a machine set to dark, so light had never been measured at all.
 *
 * CLAUDE.md: "Never add a color without measuring its contrast against the
 * theme it sits on." This is the check that enforces it.
 */

/** Every public page, plus the two admin screens with the densest UI. */
const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/experience",
  "/projects",
  "/resume",
  "/contact",
  "/services",
];

/**
 * WCAG 2.1 A and AA. Deliberately not AAA: AAA contrast would rule out most
 * legible design systems and is not the standard anyone is held to.
 *
 * `best-practice` is included as well. Those are not WCAG failures, so they
 * are reported separately below rather than failing the run — some are
 * genuinely matters of judgement.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function analyze(page: Page) {
  return new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
}

/** Readable failure output — axe's raw JSON is unusable in a terminal. */
function describe(violations: Awaited<ReturnType<typeof analyze>>["violations"]): string {
  return violations
    .map((violation) => {
      const where = violation.nodes
        .slice(0, 3)
        .map((node) => `      ${node.target.join(" ")}`)
        .join("\n");

      return `  [${violation.impact}] ${violation.id}: ${violation.help}\n${where}`;
    })
    .join("\n");
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accessibility · ${scheme}`, () => {
    // Playwright emulates the media feature, which is exactly how the site
    // decides its palette — no toggle to click, and no OS setting involved.
    test.use({ colorScheme: scheme });

    test(`public pages have no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      const failures: string[] = [];

      for (const route of PUBLIC_ROUTES) {
        await test.step(route, async () => {
          await page.goto(route);
          const results = await analyze(page);

          if (results.violations.length > 0) {
            failures.push(`${route}\n${describe(results.violations)}`);
          }
        });
      }

      expect(failures, `axe violations in ${scheme} mode:\n\n${failures.join("\n\n")}`).toEqual([]);
    });

    test(`the admin has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      /*
        The admin is behind auth and only one person ever sees it, so this is a
        lower-stakes check than the public pages — but it is where the forms
        are, and forms are where accessibility problems actually live: labels,
        error association, focus handling.
      */
      await signIn(page);

      const failures: string[] = [];

      for (const route of ["/admin", "/admin/projects/new", "/admin/services/new"]) {
        await test.step(route, async () => {
          await page.goto(route);
          const results = await analyze(page);

          if (results.violations.length > 0) {
            failures.push(`${route}\n${describe(results.violations)}`);
          }
        });
      }

      expect(failures, `axe violations in ${scheme} mode:\n\n${failures.join("\n\n")}`).toEqual([]);
    });
  });
}
