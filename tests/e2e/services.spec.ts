import { expect, test } from "@playwright/test";

/**
 * The services area, from a prospective client's point of view.
 *
 * Two things here are easy to break and invisible when broken, which is why
 * they get a spec rather than a manual check:
 *
 *   1. `/services` is deliberately absent from the main navigation, so nothing
 *      about browsing the site normally would reveal that it had stopped
 *      working. The footer link is its only in-site entry point besides About.
 *   2. `/r/[slug]` is how every outbound referral link resolves. If it broke,
 *      the failure would land on exactly the people who were about to become
 *      clients, and nobody else would ever see it.
 */

test.describe("services", () => {
  test("is reachable from the footer, but is not in the main navigation", async ({ page }) => {
    await page.goto("/");

    /*
      The header nav must NOT offer it. This is the assertion that encodes
      docs/decisions/0013 — if someone adds Services to `navItems`, the change
      is a deliberate one that fails here first rather than a quiet edit.
    */
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Services" })).toHaveCount(0);

    // The footer must offer it, because otherwise the page is unreachable
    // without knowing the URL.
    const footerLink = page.getByRole("contentinfo").getByRole("link", { name: "Services" });
    await expect(footerLink).toBeVisible();

    await footerLink.click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("lists the published services", async ({ page }) => {
    const response = await page.goto("/services");
    expect(response?.status()).toBe(200);

    // Seeded content, so this is a real assertion rather than a smoke test.
    await expect(page.getByRole("heading", { name: "Moving assistance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Home packing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Handyman and assembly" })).toBeVisible();
  });

  test("quotes no rate", async ({ page }) => {
    await page.goto("/services");

    /*
      The content test enforces this on the seed source; this enforces it on
      what is actually rendered, which is what a client reads and what could
      be held against him. The two are different checks: production content
      comes from the CMS, not from src/content.

      `innerText`, NOT `textContent`. textContent includes the contents of
      <script> tags, and Next's RSC hydration payload is full of "$1"/"$L2"
      markers — so the first version of this test failed against React's own
      serialization format rather than against anything a person can read.
    */
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\$\d/);
    expect(body).not.toMatch(/per hour|\/hr\b/i);
  });

  test("the booking link goes through /r/ and carries the promo code", async ({ page }) => {
    await page.goto("/services");

    const booking = page.getByRole("link", { name: "Book on Taskrabbit" });
    await expect(booking).toBeVisible();

    /*
      The href must be the INTERNAL route. A direct link to the destination
      would work for a visitor and silently defeat the reason the ReferralLink
      model exists — click tracking would then need every page edited.
    */
    await expect(booking).toHaveAttribute("href", "/r/taskrabbit");

    await expect(page.getByText("TSKGXDEV")).toBeVisible();
  });

  test("/r/[slug] redirects off-site to the stored destination", async ({ page }) => {
    /*
      `redirect: "manual"` so the assertion is about the redirect Next issues,
      not about whether Taskrabbit's site is up. Following it would make this
      test depend on a third party being reachable from CI.
    */
    const response = await page.request.get("/r/taskrabbit", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("https://tr.co/bidipta-r");
  });

  test("an unknown referral slug lands on /services rather than a dead end", async ({ page }) => {
    // Codes get shared and outlive their campaign. Whoever follows a retired
    // one was, a moment ago, someone considering hiring him.
    const response = await page.request.get("/r/does-not-exist", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/services");
  });
});
