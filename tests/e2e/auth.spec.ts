import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./support/auth";
import { E2E_ADMIN_EMAIL, E2E_WRONG_PASSWORD } from "./support/credentials";

/**
 * The authentication boundary, driven through a real browser.
 *
 * Phase 7 verified most of this with hand-built HTTP requests, and Phase 8
 * verified layer 3 by POSTing extracted action IDs. Both were good checks and
 * neither used a browser, so neither exercised the redirect a person actually
 * hits, the cookie the browser actually stores, or the form the browser
 * actually posts. That is what this adds.
 */

test.describe("authentication", () => {
  test("an unauthenticated visitor is redirected away from /admin", async ({ page }) => {
    await page.goto("/admin");

    // src/proxy.ts, layer 1. The callbackUrl is what returns you to the page
    // you asked for after signing in, so its absence is a real regression.
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("every admin route redirects, not just the root", async ({ page }) => {
    // The proxy matches a prefix; a route added outside its matcher would be
    // wide open and nothing else in the suite would notice.
    for (const route of ["/admin/projects", "/admin/messages", "/admin/profile"]) {
      await page.goto(route);
      await expect(page, `${route} should require a session`).toHaveURL(/\/login/);
    }
  });

  test("a wrong password is refused and issues no session", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_WRONG_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    /*
      Scoped to the form, not `page.getByRole("alert")`. Next renders its own
      `<div role="alert" id="__next-route-announcer__">` on every page for
      screen-reader route changes, so an unscoped alert role matches two
      elements — a strict-mode violation, and before that a test that could
      pass by finding the announcer instead of the error.
    */
    const error = page.locator("form").getByRole("alert");
    await expect(error).toBeVisible();

    /*
      The message must not distinguish "no such account" from "wrong password".
      A specific one turns this form into an oracle for which email addresses
      have an account — see the comment in src/server/actions/auth.ts.
    */
    await expect(error).toHaveText(/invalid email or password/i);

    // Still on /login, and still locked out of /admin. Checking the URL alone
    // would pass even if a session cookie had been issued in error.
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("correct credentials reach the admin, and signing out revokes access", async ({ page }) => {
    await signIn(page);

    await expect(page).toHaveURL(/\/admin$/);
    // The layout renders the signed-in address; its presence proves the
    // session was read on the server, not merely that a redirect happened.
    await expect(page.getByText(E2E_ADMIN_EMAIL)).toBeVisible();

    await signOut(page);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the login page is not offered to search engines", async ({ page }) => {
    const response = await page.goto("/login");

    // Tidiness rather than security — the page protects itself — but it is
    // asserted because a lost `robots` export is invisible until the URL turns
    // up in a search result.
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
