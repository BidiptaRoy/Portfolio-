/**
 * Checks that a deployment is not merely up, but internally consistent about
 * which origin it thinks it is.
 *
 *   npm run verify:deploy -- https://example.com
 *   npm run verify:deploy -- https://example.com --old https://old.vercel.app
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Why this exists
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This repo's hardest-won rule is that a green build is not a deployment
 * (see the warning at the top of CLAUDE.md — three phases shipped to a failing
 * Vercel build unnoticed). The phase-boundary check that came out of it is
 * "does a route added in this phase answer in production", which catches an
 * outage but not a misconfiguration.
 *
 * Moving to a custom domain is exactly a misconfiguration risk, and a quiet
 * one. `NEXT_PUBLIC_SITE_URL` feeds `getSiteUrl()`, which feeds `metadataBase`,
 * every canonical tag, `sitemap.xml`, `robots.txt` and both Open Graph image
 * routes. If the domain moves and that variable does not, the site serves
 * perfectly on the new domain while telling every crawler and every social
 * preview that it actually lives at the old one. Nothing errors. Every page
 * returns 200. Search engines see two sites with identical content and pick a
 * winner on your behalf.
 *
 * A human checking "does the site load" will not catch that. This will.
 */

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/experience",
  "/projects",
  "/resume",
  "/contact",
  "/services",
];

type Result = { ok: boolean; label: string; detail?: string };

const results: Result[] = [];

function record(ok: boolean, label: string, detail?: string) {
  results.push({ ok, label, detail });
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Normalises away a trailing slash so comparisons are about origin, not form. */
function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

async function fetchText(url: string): Promise<{ status: number; body: string; headers: Headers }> {
  const response = await fetch(url, { redirect: "manual" });
  return { status: response.status, body: await response.text(), headers: response.headers };
}

async function main() {
  const args = process.argv.slice(2);
  const origin = normalize(args[0] ?? "");
  const oldIndex = args.indexOf("--old");
  const oldOrigin = oldIndex >= 0 ? normalize(args[oldIndex + 1] ?? "") : null;

  if (!origin.startsWith("http")) {
    console.error(
      "\nUsage: npm run verify:deploy -- https://your-domain.com [--old https://old]\n",
    );
    process.exit(1);
  }

  console.log(`\nVerifying ${origin}\n`);

  // ── Every public route answers ───────────────────────────────────────────
  for (const route of PUBLIC_ROUTES) {
    try {
      const { status } = await fetchText(`${origin}${route}`);
      record(status === 200, `${route} responds`, `${status}`);
    } catch (error) {
      record(false, `${route} responds`, error instanceof Error ? error.message : "failed");
    }
  }

  // ── Canonical tags name THIS origin, not the old one ─────────────────────
  //
  // The check that actually matters. A canonical pointing at another origin
  // tells search engines this page is a duplicate of one somewhere else.
  for (const route of PUBLIC_ROUTES) {
    try {
      const { body } = await fetchText(`${origin}${route}`);
      const canonical = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/.exec(body)?.[1];

      if (!canonical) {
        record(false, `${route} canonical`, "no canonical tag found");
      } else {
        record(canonical.startsWith(origin), `${route} canonical`, canonical);
      }
    } catch {
      record(false, `${route} canonical`, "could not fetch");
    }
  }

  // ── Open Graph images are absolute and on this origin ────────────────────
  //
  // A relative or wrong-origin og:image is the single most common broken
  // social preview, and it is invisible until someone shares a link.
  try {
    const { body } = await fetchText(origin);
    const ogImage = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(body)?.[1];

    if (!ogImage) {
      record(false, "og:image present", "not found on the home page");
    } else {
      record(ogImage.startsWith(origin), "og:image origin", ogImage);
    }
  } catch {
    record(false, "og:image present", "could not fetch the home page");
  }

  // ── sitemap.xml lists this origin only ───────────────────────────────────
  try {
    const { status, body } = await fetchText(`${origin}/sitemap.xml`);
    const locations = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? "");
    const foreign = locations.filter((url) => !url.startsWith(origin));

    record(status === 200 && locations.length > 0, "sitemap.xml", `${locations.length} URLs`);
    record(
      foreign.length === 0,
      "sitemap URLs use this origin",
      foreign.length > 0 ? `${foreign.length} point elsewhere, e.g. ${foreign[0]}` : "all match",
    );
  } catch {
    record(false, "sitemap.xml", "could not fetch");
  }

  // ── robots.txt points at this origin's sitemap ───────────────────────────
  try {
    const { body } = await fetchText(`${origin}/robots.txt`);
    const sitemap = /Sitemap:\s*(\S+)/i.exec(body)?.[1];
    record(Boolean(sitemap?.startsWith(origin)), "robots.txt sitemap", sitemap ?? "not declared");
  } catch {
    record(false, "robots.txt", "could not fetch");
  }

  // ── Security headers survived the move ───────────────────────────────────
  //
  // These come from next.config.ts, so a domain change cannot drop them — but
  // a proxy or a redirect in front of the app can, and that would be silent.
  try {
    const { headers } = await fetchText(origin);
    for (const header of ["content-security-policy", "x-content-type-options", "referrer-policy"]) {
      record(Boolean(headers.get(header)), `header ${header}`);
    }
  } catch {
    record(false, "security headers", "could not fetch");
  }

  // ── The old origin redirects rather than serving a duplicate ─────────────
  if (oldOrigin) {
    try {
      const { status, headers } = await fetchText(oldOrigin);
      const location = headers.get("location") ?? "";
      const redirects = status >= 300 && status < 400 && location.includes(new URL(origin).host);

      record(redirects, "old origin redirects here", `${status} → ${location || "(no Location)"}`);
    } catch {
      record(false, "old origin redirects here", "could not fetch");
    }
  }

  const failed = results.filter((result) => !result.ok);

  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed` +
      (failed.length > 0 ? ` — ${failed.length} FAILED\n` : "\n"),
  );

  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
