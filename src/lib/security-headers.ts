/**
 * ─────────────────────────────────────────────────────────────────────────
 * SECURITY RESPONSE HEADERS, including the Content Security Policy.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Imported by `next.config.ts`, which is why this module has no
 * `server-only` guard and no `@/` import: the Next config is evaluated
 * outside the app's module graph, before any alias exists.
 *
 * It lives here rather than inline in the config so the policy can be
 * asserted in `tests/unit/security-headers.test.ts`. A CSP is a long string
 * in which one wrong token silently either breaks the site or protects
 * nothing, and neither failure is visible from reading a diff.
 */

/** Vercel Blob serves each store from its own subdomain of this host. */
const BLOB_HOST = "https://*.public.blob.vercel-storage.com";

/**
 * The Content Security Policy.
 *
 * ══ WHY THIS IS NOT A NONCE-BASED POLICY ══
 *
 * A nonce is the stronger design and it is the one the Next.js guide leads
 * with. It also **requires dynamic rendering on every page** — Next injects
 * nonces during server-side rendering from the request's own CSP header, and
 * a prerendered page has no request. The guide is explicit that static
 * generation, ISR and CDN caching are all disabled by it.
 *
 * This site is prerendered on purpose. `/projects` is the single dynamic
 * route, and that was a considered trade (see Phase 4 in docs/roadmap.md).
 * Trading every page's prerendering for a stricter script policy, on a site
 * that loads no third-party script at all, is the wrong side of that trade:
 * the attack a nonce prevents is an injected inline script, and the only
 * inline scripts here are Next's own hydration payload and one JSON-LD
 * block this repo generates.
 *
 * The honest cost is that `'unsafe-inline'` in `script-src` means an
 * attacker who achieves HTML injection can run script. What still holds is
 * everything else: no external script origin is allowed, so an injected
 * `<script src>` pointing anywhere off-origin is refused, as is every
 * `connect-src` exfiltration target.
 *
 * The upgrade path that keeps prerendering is Next's experimental
 * Subresource Integrity support (`experimental.sri`), which hashes scripts
 * at build time. It is marked experimental and this repo has been burned by
 * things that worked locally and failed on deploy, so it is deliberately
 * not enabled yet. Revisit when it leaves experimental.
 */
const DIRECTIVES: Record<string, string[]> = {
  // Everything not named below falls back to same-origin only.
  "default-src": ["'self'"],

  /*
    'unsafe-inline' covers Next's hydration payload (`self.__next_f.push`)
    and the JSON-LD block in person-json-ld.tsx — CSP applies to an inline
    <script> regardless of its type, so `application/ld+json` needs it too.
    No off-origin script host is permitted.
  */
  "script-src": ["'self'", "'unsafe-inline'"],

  /*
    'unsafe-inline' here is for a style ATTRIBUTE, not a <style> tag. The
    built markup contains no inline stylesheet at all — Tailwind compiles to
    one same-origin file and next/font self-hosts — but `next/image` emits
    `style="position:absolute;…"` on a fill image, which is the home page's
    hero portrait, and CSP governs style attributes under this directive.

    Verified against the built HTML rather than assumed: every page has zero
    <style> tags, and `/` has exactly one style attribute. Removing this
    token therefore looks safe and silently breaks the hero's layout.
    'unsafe-hashes' plus a hash would be tighter in principle and would need
    re-hashing whenever next/image changes that string.
  */
  "style-src": ["'self'", "'unsafe-inline'"],
  "font-src": ["'self'"],

  /*
    next/image proxies remote files through /_next/image, which is
    same-origin — but the Blob host is listed because an uploaded image's
    URL is also used unoptimized in metadata and Open Graph tags. `data:`
    and `blob:` cover the generated OG images.
  */
  "img-src": ["'self'", "data:", "blob:", BLOB_HOST],

  /*
    ⚠ NOT 'none', which is the usual recommendation and would break the
    resume. /resume embeds the PDF in an <object data={fileUrl}> — chosen
    over an iframe because it degrades to its children where a browser
    cannot render a PDF inline. That file is either a committed asset under
    /public (the seeded default) or an uploaded Blob URL, so both origins
    have to be allowed here and in frame-src: browsers differ on whether a
    PDF object is governed by object-src or frame-src.
  */
  "object-src": ["'self'", BLOB_HOST],
  "frame-src": ["'self'", BLOB_HOST],

  // Server Actions POST to their own origin. Nothing else is contacted.
  "connect-src": ["'self'"],

  // The contact form and the login form both post to this origin.
  "form-action": ["'self'"],

  // Clickjacking. `frame-ancestors` is the modern control; the legacy
  // X-Frame-Options below says the same thing for older browsers.
  "frame-ancestors": ["'none'"],

  // Stops an injected <base> tag from re-pointing every relative URL.
  "base-uri": ["'self'"],
};

/** Directives with no value, appended after the pairs above. */
const FLAGS = ["upgrade-insecure-requests"];

export function contentSecurityPolicy(): string {
  const pairs = Object.entries(DIRECTIVES).map(
    ([directive, values]) => `${directive} ${values.join(" ")}`,
  );

  return [...pairs, ...FLAGS].join("; ");
}

/**
 * The full header set applied to every response.
 *
 * `Content-Security-Policy` is enforcing, not report-only. Report-only was
 * considered and rejected: with no reporting endpoint it produces nothing
 * but browser-console noise nobody is watching, which is indistinguishable
 * from having no policy while costing the same header bytes.
 */
export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },

    /*
      HSTS. Two years, subdomains included, but deliberately NOT `preload`:
      preloading is submitted to a browser-vendor list and is slow and
      awkward to reverse, and this site does not have its own domain yet
      (Phase 11). Add `preload` with the custom domain, not before.

      Vercel already sends HSTS for *.vercel.app; this makes the guarantee
      the app's own rather than the platform's.
    */
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },

    // Stops a browser second-guessing a declared Content-Type — the other
    // half of the defence that src/lib/storage.ts starts by deriving the
    // stored type from the file's actual bytes.
    { key: "X-Content-Type-Options", value: "nosniff" },

    // Send the full URL within this site, only the origin when leaving it,
    // and nothing at all when downgrading to http.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

    // Legacy companion to frame-ancestors, for browsers that predate it.
    { key: "X-Frame-Options", value: "DENY" },

    /*
      Nothing here uses a camera, a microphone, location, or payments. This
      turns them off rather than leaving them available to be prompted for,
      which also means an injected script cannot ask on the site's behalf.
    */
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },

    /*
      Severs `window.opener` for anything this site opens in a new tab — the
      resume's "open in new tab" link among them — so the opened page cannot
      navigate this one.
    */
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
