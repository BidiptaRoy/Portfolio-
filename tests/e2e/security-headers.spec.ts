import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

import { signIn } from "./support/auth";

/**
 * The Content-Security-Policy, checked the one way it had not been.
 *
 * Phase 10b verified this policy by auditing the built markup — every
 * off-origin reference, every inline script, every style attribute — and by
 * unit-testing the header string. Both are worth having and neither can catch
 * the failure that matters, because a CSP does nothing until a browser
 * enforces it. Something the audit reasoned was permitted, but is not, shows
 * up as a blocked resource and a console error, and as nothing else at all.
 *
 * docs/roadmap.md carries this as an open item: "Confirm no CSP violations in
 * a browser console." This is that, automated, so it stays confirmed.
 */

/** Chromium's wording when a directive blocks something. */
const CSP_VIOLATION = /content security policy|refused to (load|execute|apply|connect|frame)/i;

/** Pages worth loading, chosen for what they exercise rather than for coverage. */
const PUBLIC_ROUTES = [
  "/", // hero portrait via next/image → the style ATTRIBUTE that style-src must allow
  "/about",
  "/experience",
  "/projects", // the only dynamic public route
  "/resume", // <object data=…> → object-src and frame-src
  "/contact", // the public form
  "/services", // the client-facing area — reached from the footer, not the nav
];

/**
 * Waits long enough for a refusal to have been reported, deterministically.
 *
 * NOT `waitForLoadState("networkidle")`, which is what this used first and
 * which Playwright's own docs discourage. It waits for a 500ms gap in network
 * activity, and Next's link prefetching keeps reopening that gap — the suite
 * went from 53s to 2.5m and then failed on a timeout that had nothing to do
 * with the policy under test. A test that fails for reasons unrelated to its
 * subject is worse than no test, because it trains you to re-run it.
 *
 * `page.goto` already resolves on `load`, so every subresource the document
 * references has been requested and either fetched or refused by then. This
 * short fixed pause covers the console message being delivered to the
 * listener, which is the only thing still outstanding.
 */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(250);
}

function watchForViolations(messages: string[]) {
  return (message: ConsoleMessage) => {
    if (message.type() === "error" && CSP_VIOLATION.test(message.text())) {
      messages.push(`${message.location().url}: ${message.text()}`);
    }
  };
}

test.describe("security headers", () => {
  test("no public page trips the CSP in a real browser", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", watchForViolations(violations));
    // A blocked subresource also surfaces here, which catches the case where
    // nothing is logged to the console but an asset silently never loads.
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "";
      if (/blocked/i.test(failure)) {
        violations.push(`${request.url()}: ${failure}`);
      }
    });

    for (const route of PUBLIC_ROUTES) {
      await test.step(route, async () => {
        await page.goto(route);
        await settle(page);
      });
    }

    expect(violations, `CSP violations:\n${violations.join("\n")}`).toEqual([]);
  });

  test("no admin page trips the CSP either", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", watchForViolations(violations));

    await signIn(page);

    // The admin is where the interactive client components live — forms with
    // useActionState, the nav — so it exercises script-src differently from
    // the mostly-static public pages.
    for (const route of ["/admin", "/admin/projects/new", "/admin/profile", "/admin/messages"]) {
      await test.step(route, async () => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
      });
    }

    expect(violations, `CSP violations:\n${violations.join("\n")}`).toEqual([]);
  });

  test("the headers are actually on the response", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};

    /*
      next.config.ts applies these to every response, not src/proxy.ts — the
      proxy is scoped to /admin on purpose. If that ever moved, the public site
      would lose its headers while the admin kept them, and every other test
      here would still pass.
    */
    expect(headers["content-security-policy"]).toBeTruthy();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeTruthy();
    expect(headers["x-frame-options"]).toBeTruthy();
    expect(headers["permissions-policy"]).toBeTruthy();
    expect(headers["cross-origin-opener-policy"]).toBeTruthy();

    /*
      No off-origin script host may be permitted. This is the property that
      keeps `script-src 'unsafe-inline'` an acceptable trade — an injected
      <script src="https://evil/"> is still refused — so it is asserted
      directly rather than left implied.
    */
    const csp = headers["content-security-policy"] ?? "";
    const scriptSrc = /script-src ([^;]*)/.exec(csp)?.[1] ?? "";
    expect(scriptSrc).not.toMatch(/https?:\/\//);
  });
});
