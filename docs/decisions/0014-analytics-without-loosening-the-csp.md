# 0014 — Vercel Analytics and Speed Insights, without loosening the CSP

**Status:** Accepted · Phase 11

## Context

Phase 11 calls for error monitoring and analytics. The site has been live for weeks with no
observability of any kind: if a page broke for a visitor, or if the real-world Core Web
Vitals were nothing like the 99 that Lighthouse reported from one laptop on one connection,
nobody would know.

`CLAUDE.md` makes this a decision rather than an install:

> **Never loosen the CSP to make something work.** Every token in
> `src/lib/security-headers.ts` is either needed by something in the built markup or
> deliberately absent, and the tests say which. If a new dependency needs an off-origin
> script or `connect-src` entry, that is a decision about the dependency, not a header edit.

That rule is load-bearing here. The CSP keeps `'unsafe-inline'` in `script-src`, and the
argument for why that is acceptable rests entirely on one property: **no off-origin script
host is permitted**, so an injected `<script src>` is still refused. An analytics vendor
that needs its own script host does not merely add a directive — it removes the reason the
existing policy is defensible.

## Decision

**Vercel Analytics and Speed Insights. No Sentry. No CSP change.**

### The CSP is genuinely unchanged, and that was checked rather than assumed

Both packages resolve their script like this:

```js
if (isDevelopment()) return "https://va.vercel-scripts.com/v1/script.debug.js";
if (props.basePath) return makeAbsolute(`${props.basePath}/insights/script.js`);
return "/_vercel/insights/script.js";
```

In production the script is **same-origin** — Vercel's edge proxies `/_vercel/insights/…`
and `/_vercel/speed-insights/…` — and so are the beacons. `'self'` already covers both, so
`script-src` and `connect-src` are untouched.

The off-origin host does appear as a string in the built client bundle, which looks alarming
and is not. It sits behind `isDevelopment()`, which compiles to:

```js
function i() {
  return "development" === ((o() ? window.vam : a()) || "production");
}
```

`NODE_ENV` is **absent** from the production bundle — Next inlines it — so the fallback
resolves to `"production"`, `i()` is permanently `false`, and the branch is unreachable dead
string. Confirmed by reading the emitted chunk, not by reasoning about the source.

### Both components render only when `VERCEL === "1"`

Off Vercel there is no `/_vercel` proxy, and the dev fallback is the off-origin script the
CSP correctly refuses. Rendering them everywhere would mean a permanent CSP violation in the
console of `next dev` — the one environment where a real violation most needs to stand out —
and a 404 under `npm start` and in the e2e suite. Neither collects anything useful, so
neither is rendered.

### Why not Sentry

Sentry is the only option that answers "did a Server Action throw for a real visitor", which
is a genuine gap and is named under Consequences. It was still rejected for now:

- It needs a `connect-src` entry — a real decision under the rule quoted above, not a free one.
- It ships a substantial client bundle to a site whose whole performance story is that it
  ships almost none.
- It sends session data to a third party, which for a personal site with a contact form is a
  privacy cost with no corresponding user benefit.

Against a prerendered site with 194 unit tests and 19 end-to-end tests, the expected number
of caught-only-by-Sentry incidents is low. That calculus changes if the services area grows
into something people transact against.

### Privacy, and why there is no consent banner

Vercel Analytics is cookieless and sets no cross-site identifier, so it does not require
consent under GDPR/ePrivacy in the way a cookie-based analytics product does. This is worth
recording because "add analytics" is normally followed by "add a consent banner", and the
absence of one here is a consequence of the choice rather than an oversight.

## Consequences

**Production errors are still unobserved.** Analytics answers "is anyone visiting and is it
fast", not "did it break". A Server Action throwing for a visitor still produces nothing but
a Vercel function log nobody reads. That is an accepted gap, and it is the reason to revisit
Sentry — not a reason to pretend this covers it.

**The Lighthouse number is no longer the only performance evidence.** Speed Insights reports
Core Web Vitals from real devices and connections. Where they disagree, the field data is
right and the lab number was measuring a laptop.

**Two dependencies now sit in the client bundle** on a site that had almost none. Both are
small and first-party to the host, but they are the first client-side third-party code here,
and that is a line worth noticing having been crossed.

**If Vercel ever changes the script to an off-origin host, analytics breaks rather than the
policy bending.** The CSP refuses it, `security-headers.test.ts` still asserts no off-origin
script host, and the correct response is to drop the dependency — not to add the host.
