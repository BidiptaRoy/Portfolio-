import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";

/**
 * A CSP is a single long string in which one wrong token either breaks the
 * site or silently protects nothing, and neither failure shows up in a diff
 * or in a build. These tests pin the decisions that were actually reasoned
 * about — especially the two that look like mistakes and are not.
 */

/** The directives, parsed back out of the header string. */
function directives(): Map<string, string[]> {
  return new Map(
    contentSecurityPolicy()
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .filter((tokens): tokens is [string, ...string[]] => tokens.length > 0 && tokens[0] !== "")
      .map(([name, ...values]) => [name, values]),
  );
}

describe("contentSecurityPolicy", () => {
  it("defaults to same-origin", () => {
    expect(directives().get("default-src")).toEqual(["'self'"]);
  });

  it("allows no off-origin script source", () => {
    /*
      'unsafe-inline' is present on purpose — see the module comment: a
      nonce would force dynamic rendering on every page, and the only
      inline scripts here are Next's hydration payload and this repo's own
      JSON-LD. What must never appear is a host: an injected
      `<script src="https://evil.example/x.js">` has to be refused.
    */
    const scriptSrc = directives().get("script-src") ?? [];

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc.filter((value) => value.includes("://"))).toEqual([]);
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("*");
  });

  it("keeps the home page's hero portrait laid out", () => {
    /*
      REGRESSION GUARD, and a counter-intuitive one. The built markup has
      zero inline <style> tags, so `style-src 'unsafe-inline'` looks like
      dead permissiveness worth deleting. It is not: next/image emits a
      `style="position:absolute;…"` ATTRIBUTE on the fill image used for
      the hero portrait, and CSP governs style attributes under this
      directive. Removing the token breaks that layout silently.
    */
    expect(directives().get("style-src")).toContain("'unsafe-inline'");
  });

  it("keeps the resume preview working", () => {
    /*
      REGRESSION GUARD. `object-src 'none'` is the standard recommendation
      and it would break /resume, which embeds the PDF in an
      <object data={fileUrl}>. The file is either a committed asset under
      /public or an uploaded Blob URL, so both origins must be allowed —
      and in frame-src too, because browsers disagree about which directive
      governs a PDF object.
    */
    for (const directive of ["object-src", "frame-src"]) {
      const values = directives().get(directive) ?? [];

      expect(values, `${directive} must not be 'none'`).not.toContain("'none'");
      expect(values).toContain("'self'");
      expect(values).toContain("https://*.public.blob.vercel-storage.com");
    }
  });

  it("allows uploaded images without allowing arbitrary hosts", () => {
    const imgSrc = directives().get("img-src") ?? [];

    expect(imgSrc).toContain("https://*.public.blob.vercel-storage.com");
    expect(imgSrc).toContain("data:");
    expect(imgSrc).not.toContain("*");
    expect(imgSrc).not.toContain("https:");
  });

  it("refuses to be framed, and restricts where forms can post", () => {
    expect(directives().get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives().get("form-action")).toEqual(["'self'"]);
    expect(directives().get("base-uri")).toEqual(["'self'"]);
  });

  it("limits where the page may connect", () => {
    // The exfiltration half of an XSS. Server Actions post to their own
    // origin and nothing else is contacted.
    expect(directives().get("connect-src")).toEqual(["'self'"]);
  });

  it("upgrades insecure requests", () => {
    expect(contentSecurityPolicy()).toMatch(/upgrade-insecure-requests/);
  });

  it("emits a syntactically clean header", () => {
    const header = contentSecurityPolicy();

    // A stray newline or a doubled semicolon makes browsers discard the
    // directive that follows, which fails open and silently.
    expect(header).not.toMatch(/[\n\r]/);
    expect(header).not.toMatch(/;;|;\s*$/);
    expect(header).not.toMatch(/\s{2,}/);
  });
});

describe("securityHeaders", () => {
  const byKey = new Map(securityHeaders().map((header) => [header.key, header.value]));

  it.each([
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
  ])("sets %s", (key) => {
    expect(byKey.get(key)).toBeTruthy();
  });

  it("sets HSTS for two years without preload", () => {
    // `preload` is submitted to a browser-vendor list and is slow to
    // reverse. It waits for a custom domain in Phase 11.
    const hsts = byKey.get("Strict-Transport-Security") ?? "";

    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).not.toContain("preload");
  });

  it("enforces the policy rather than only reporting it", () => {
    expect(byKey.has("Content-Security-Policy")).toBe(true);
    expect(byKey.has("Content-Security-Policy-Report-Only")).toBe(false);
  });

  it("names no duplicate header", () => {
    // Two entries for one key is a merge conflict resolved badly, and the
    // resulting behaviour differs by CDN.
    const keys = securityHeaders().map((header) => header.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
