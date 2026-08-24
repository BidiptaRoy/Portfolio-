import { expect, type Page } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./credentials";

/**
 * Signs in through the real form, as a person would.
 *
 * Deliberately not a shortcut that forges a session cookie. The sign-in path is
 * itself one of the things under test — the proxy redirect, the Server Action,
 * `authorize()`, argon2 verification, and now the rate limit all sit on it —
 * and a helper that bypassed them would quietly stop exercising the boundary
 * these tests exist to cover.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/login");

  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // The redirect to /admin is the only proof the credentials were accepted;
  // the form shows the same opaque message for every kind of failure, so
  // asserting on its absence would prove nothing.
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Signs out through the header form, so the session is genuinely cleared. */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/admin"));
}
