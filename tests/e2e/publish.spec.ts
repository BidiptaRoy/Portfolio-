import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";

/**
 * The founding requirement of this project, end to end: content is edited as
 * data through the CMS and appears on the public site without a deploy.
 *
 * The pieces have all been checked in isolation — the actions in unit tests,
 * the queries' PUBLISHED filter in the façade sweep, `revalidatePath` by
 * reading src/server/revalidate.ts. What none of that proves is that a project
 * created in the admin actually reaches a public URL, because that depends on
 * revalidation happening in a real production server. It cannot be tested in
 * `next dev`, and it cannot be tested without a browser.
 *
 * The draft half matters just as much as the published half. "Nothing is
 * public until you publish it" is a promise the new-project page makes in
 * writing, and a regression that published drafts would be discovered by
 * someone reading the live site.
 */

/*
  Unique per run. Two runs overlapping — or one that crashed before its cleanup
  — must not collide on the slug's unique constraint and fail the next run for
  a reason that has nothing to do with the code under test.
*/
const stamp = Date.now();
const SLUG = `e2e-publish-${stamp}`;
const TITLE = `E2E Publish Check ${stamp}`;
const SUMMARY = "Created by the end-to-end suite. Deleted by it too.";

test.describe("create → publish → public", () => {
  test.afterEach(async ({ page }) => {
    /*
      Cleanup runs even when the test fails partway. A leftover row is not
      merely untidy: if the failure happened after publishing, it is a stray
      project on a public page.

      Best-effort on purpose — if the row was never created, or the sign-in
      itself was what failed, this should not turn one red test into two.
    */
    try {
      /*
        No sign-in here. This hook shares the test's `page`, so the session it
        established is still live — and calling signIn() again would navigate
        to /login, be redirected straight to /admin because a session exists,
        and then wait forever for an email field that is not on the page. That
        cost the whole test its 30-second timeout on the first run.

        If the test failed before signing in there is no session, this
        redirects to /login, the delete button is simply absent, and there was
        nothing to clean up anyway.
      */
      await page.goto(`/admin/projects/${SLUG}`);

      const deleteButton = page.getByRole("button", { name: "Delete this project" });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForURL("**/admin/projects");
      }
    } catch {
      // Reported by the test that actually failed; swallowing keeps the
      // failure readable.
    }
  });

  test("a draft is invisible publicly, and publishing makes it appear", async ({ page }) => {
    await signIn(page);

    await test.step("create it as a draft", async () => {
      await page.goto("/admin/projects/new");

      await page.getByLabel("Title").fill(TITLE);
      await page.getByLabel("Slug").fill(SLUG);
      await page.getByLabel("Summary").fill(SUMMARY);
      await page.getByLabel("Description").fill("A project row created by an automated test.");
      await page.getByLabel("Technologies").fill("Playwright\nTypeScript");

      // The form defaults to DRAFT; set it explicitly so the test still means
      // what it says if that default ever changes.
      await page.getByLabel("Status").selectOption("DRAFT");

      await page.getByRole("button", { name: "Create project" }).click();

      /*
        The form's own error banner, by its data attribute rather than by role.
        Next renders `<div role="alert" id="__next-route-announcer__">` on every
        page, so an unscoped alert role would always be visible and this would
        fail on every run regardless of whether the save succeeded.

        Catching a rejected save here gives a real reason instead of a
        confusing "not found" several steps further down.
      */
      await expect(page.locator("[data-form-error]")).toBeHidden();
      await page.waitForURL("**/admin/projects");
    });

    await test.step("the admin lists it as a draft", async () => {
      await expect(page.getByRole("link", { name: TITLE })).toBeVisible();
    });

    await test.step("the public site does not have it yet", async () => {
      const response = await page.goto(`/projects/${SLUG}`);

      // 404, not a page with the content hidden. The public query filters on
      // status, so an unpublished slug simply does not exist.
      expect(response?.status(), "an unpublished project must 404").toBe(404);

      await page.goto("/projects");
      await expect(page.getByText(TITLE)).toBeHidden();
    });

    await test.step("publish it", async () => {
      await page.goto("/admin/projects");

      /*
        Through the list's Publish button — the same Server Action a person
        uses, which is also the path that calls revalidatePath. Editing the row
        and changing Status would exercise a different action.
      */
      const row = page.locator("li").filter({ hasText: TITLE });
      await row.getByRole("button", { name: "Publish" }).click();

      await expect(row.getByRole("button", { name: "Unpublish" })).toBeVisible();
    });

    await test.step("it is now public, without a deploy", async () => {
      const response = await page.goto(`/projects/${SLUG}`);

      /*
        This is the assertion the whole project is built around. It passing
        means the revalidation in src/server/revalidate.ts reached a
        prerendered dynamic route in a production server — the thing that
        cannot be checked any other way.
      */
      expect(response?.status(), "a published project must be reachable").toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
      await expect(page.getByText(SUMMARY)).toBeVisible();
    });

    await test.step("and it is listed on /projects", async () => {
      await page.goto("/projects");
      await expect(page.getByText(TITLE)).toBeVisible();
    });

    await test.step("unpublishing takes it back down", async () => {
      await page.goto("/admin/projects");

      const row = page.locator("li").filter({ hasText: TITLE });
      await row.getByRole("button", { name: "Unpublish" }).click();
      await expect(row.getByRole("button", { name: "Publish" })).toBeVisible();

      /*
        Polled, not asserted on the first response — and that is a finding
        rather than a workaround for a flaky test.

        Measured on this suite's first run: the first request after
        unpublishing returns 200 with the STALE page, and every request after
        it returns 404. Identical whether the page is navigated to or fetched
        directly, so it is not the browser's cache — it is Next serving the
        invalidated page once more while it regenerates behind it.

        The practical consequence is worth knowing and is documented in
        CLAUDE.md: unpublishing is not instantaneous. Exactly one more visitor
        can see a project after it is taken down. That is acceptable here and
        it is not what "every mutation revalidates" sounds like it means.

        Asserting the first response would therefore encode a promise the
        framework does not make. Polling asserts the one that matters: it does
        come down, and quickly.
      */
      await expect
        .poll(async () => (await page.request.get(`/projects/${SLUG}`)).status(), {
          message: "unpublishing must take the page down",
          timeout: 10_000,
        })
        .toBe(404);
    });
  });
});
