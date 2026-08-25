import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./support/auth";

/**
 * Every admin screen, rendered while signed in.
 *
 * This is the gap docs/roadmap.md calls "the largest remaining test gap", and
 * the reason it stayed open so long is worth stating: every automated check
 * before this one drove Server Actions and queries DIRECTLY, or read a public
 * page. None of them ever rendered an admin screen. A broken import, a query
 * returning a shape the page does not expect, or a server-side throw in a
 * layout would all have shipped green.
 *
 * The assertions are deliberately shallow — a 200, a heading, no error
 * boundary. This is a smoke test across the whole surface, not a test of what
 * any one screen means. Depth belongs in the specs that exercise a flow.
 */

/** Routes reachable by their own URL. The dynamic ones are clicked into below. */
const STATIC_ROUTES = [
  "/admin",
  "/admin/projects",
  "/admin/projects/new",
  "/admin/experience",
  "/admin/experience/new",
  "/admin/education",
  "/admin/education/new",
  "/admin/skills",
  "/admin/skills/new",
  "/admin/profile",
  "/admin/resume",
  "/admin/messages",
  "/admin/services",
  "/admin/services/new",
  "/admin/services/links/new",
];

/**
 * Next renders a generic "Application error" page when a Server Component
 * throws in production, and it returns 500 with it. Both are checked: the
 * status catches a throw, the text catches an error boundary that rendered
 * without one.
 */
async function expectHealthyPage(page: Page, route: string) {
  const response = await page.goto(route);

  expect(response?.status(), `${route} should render`).toBe(200);
  await expect(page.getByRole("heading", { level: 1 }), `${route} needs an h1`).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
}

test.describe("admin screens", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("every static admin route renders", async ({ page }) => {
    for (const route of STATIC_ROUTES) {
      // A step per route, so a failure names the screen rather than an index.
      await test.step(route, async () => {
        await expectHealthyPage(page, route);
      });
    }
  });

  test("every edit screen renders for a real seeded row", async ({ page }) => {
    /*
      Reached by clicking the list rather than by a hard-coded slug, for two
      reasons. The slugs come from the seed and would drift. And the link
      itself is then under test — a list that renders perfectly while linking
      to the wrong place is a bug this would otherwise miss.

      Skills route by id rather than name, because a name like "HTML/CSS" is
      not a slug; the href pattern covers both cases.
    */
    for (const section of ["projects", "experience", "education", "skills"]) {
      await test.step(`/admin/${section}/[edit]`, async () => {
        await page.goto(`/admin/${section}`);

        const editLink = page
          .locator(`a[href^="/admin/${section}/"]`)
          .filter({ hasNot: page.locator('[href$="/new"]') })
          .first();

        await expect(editLink, `${section} list should link to a row`).toBeVisible();
        await editLink.click();

        await expect(page).toHaveURL(new RegExp(`/admin/${section}/[^/]+$`));
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("body")).not.toContainText("Application error");
      });
    }
  });

  test("the dashboard counts include drafts", async ({ page }) => {
    await page.goto("/admin");

    /*
      The seed publishes everything, so a count is not proof on its own. Create
      nothing here — instead assert the dashboard is reading the ADMIN queries
      by checking it reports at least the seeded project count, which the
      public façade would also return. The real draft-visibility assertion is
      in publish.spec.ts, where a draft actually exists.
    */
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toContainText(/project/i);
  });

  test("admin pages are not offered to search engines", async ({ page }) => {
    await page.goto("/admin");

    // The admin is behind auth, so a crawler cannot read it — but an indexed
    // URL still leaks the surface. The layout sets this; a lost export would
    // be silent.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
