# Development Roadmap

Eleven phases. Each is independently reviewable, mergeable, and deployable. **One phase per
working block, with a stop-and-review checkpoint at the end.** No phase is attempted in a
single operation.

> 🔴 **10b is NOT complete, and was left open deliberately.** CI is red on the
> End-to-end job and **its log has never been read** — that is the single blocker, and
> branch protection sits behind it. Work moved on with it known-open rather than pretending
> otherwise. Everything else in 10b has since closed.

**Phases 1–11 and 12a are complete. 10b has one blocker: the CI log.** The site is live at
its own domain, every content type is editable at `/admin`, media uploads to Vercel Blob,
the contact form stores and emails, and `/services` carries the client-facing area with its
referral link as data. **194 unit tests and 23 end-to-end tests** — the latter covering the
auth boundary, every admin screen signed in, create → publish → appears publicly, a CSP
check in a real browser, and an axe audit in both colour schemes.

**Databases are now split per environment** (`docs/decisions/0012`): `production` on Vercel
only, `development` in `.env.local`, `e2e` for the Playwright suite. Migrations are applied
by the deployment itself, gated on `VERCEL_ENV=production`. That closed the condition
`docs/decisions/0011` could only bound — `npm run db:seed` and `db:reset` no longer point at
live content.

Set `E2E_DATABASE_URL` and `E2E_DIRECT_URL` in `.env.local`; `npm run e2e` refuses to start
without them, and refuses again if they name the same database as `DATABASE_URL`.

Live: https://bidiptaroy.com

The ordering is deliberate: **a live, deployed public site exists at the end of Phase 5**,
before the database, authentication, or CMS. The read façade (`src/server/queries/`) is what
makes that safe rather than throwaway — Phase 6 swaps its internals to Prisma without
touching a single component.

---

## Phase 1 — Foundation

Repository that builds, deploys, and explains itself. No features.

- [x] Git identity configured
- [x] `.gitattributes` (LF normalization) committed before anything else
- [x] Next.js scaffold — TypeScript, Tailwind, App Router, ESLint, `src/`, `@/*` alias
- [x] Strict TypeScript (`noUncheckedIndexedAccess`), Prettier, npm scripts
- [x] `.gitignore` fixed so `.env.example` is committed
- [x] Directory skeleton
- [x] `CLAUDE.md`, `README.md`, `docs/`, ADRs 0001–0004
- [x] `.env.example`
- [x] Verify: typecheck, lint, build all clean
- [x] First commit and push to `origin/main`
- [x] Connect Vercel, confirm live URL

**Phase 1 complete.** Two findings worth carrying forward: this is Next.js **16**, not 15
(the caching model changed — re-check assumptions in Phase 6), and `npm run typecheck` must
run `next typegen` first or it fails on a fresh clone. Both are documented in `CLAUDE.md`.

## Phase 2 — Design system

Visual identity and layout shell. **Timeboxed** — this is where portfolio projects stall.

- [x] Design tokens as CSS custom properties — "Editorial Oat", contrast measured
- [x] Typefaces: Fraunces (serif headings) + Inter (sans body)
- [x] Warm dark theme via `prefers-color-scheme`, tokens only, no toggle
- [x] `components/ui/`: Button, Card, Badge, Eyebrow, Rule, SectionHeading
- [x] `components/layout/`: Container, SiteHeader, SiteNav, SiteFooter, SkipLink
- [x] Responsive layout, focus states, skip link, reduced-motion support
- [x] Stub pages for the five nav routes so the shell is navigable

**Phase 2 complete.** Decisions recorded in `docs/decisions/0005`. Notably: no animation
library — it works against the "runs on any machine" requirement, and the brief asked for
static detailing. The only client component is `SiteNav`.

> Remaining for later: real page content is Phase 4, and the stub pages still say
> "This section is being written."

## Phase 3 — Content contracts

Types and real content. Still no database.

- [x] TypeScript types for every entity in `src/types/content.ts`
- [x] Zod schemas in `src/lib/validation/content.ts`, parsed at content import
- [x] Typed content modules in `src/content/` with **real** data, migrated from
      Bidipta's previous site
- [x] `src/server/queries/` façade ← **the seam Phase 6 depends on**, guarded
      with `server-only`

**Phase 3 complete.** Content decisions taken: Computer Science (not CS & Business, which
the old site claimed); phone number omitted deliberately; the old site's self-reported stat
bar ("5+ projects", "4+ years coding") dropped as unverifiable padding.

Outstanding content gaps — these need Bidipta, not invention:

- [x] **Taskrabbit dates — supplied and live.** Confirmed by Bidipta 2026-08-24:
      started mid-April 2026, ongoing, worked around his availability. Already
      recorded as `startDate: "2026-04"` / `current: true` /
      `engagementType: "PLATFORM_ENGAGEMENT"` / `platform: "Taskrabbit"` /
      `organization: null`, and verified rendering on the production
      `/experience` page as _via Taskrabbit_.
- [ ] **`outcomes` and `challenges` are empty on every project.** These are what make a
      detail page worth reading, and they cannot be fabricated.
- [ ] **Confirm B.A. vs B.S.** — currently "Bachelor's degree", accurate either way.
- [ ] **Project screenshots.** Upload support exists as of Phase 9a; the
      images themselves still need to be taken and uploaded at `/admin`.

## Phase 4 — Public portfolio

- [x] Home — hero, featured projects, technical experience strip, contact prompt
- [x] About — narrative, education, skills, social links, services pointer
- [x] Experience — three sections from `Experience.kind`; empty ones are omitted
- [x] Resume — download, new-tab, and inline preview; degrades when unpublished
- [x] Projects index with technology filtering, driven by `?tech=` in the URL
- [x] Project detail `[slug]` — prerendered per project; Outcomes, Challenges,
      and My role are omitted entirely when empty
- [x] Contact — mailto and social links; the form arrived in Phase 9b and sits
      alongside the mailto rather than replacing it

**Phase 4 complete.** `/projects` is the only dynamic route, because reading
`searchParams` opts out of prerendering. Accepted deliberately: a shareable
`/projects?tech=Python` URL is worth more than prerendering a seven-item list,
and the filter costs zero JavaScript.

> The resume PDF currently published has a typo in its contact email
> (`bidiptar@bu.com` should be `bidiptar@bu.edu`). Set `status` to `"DRAFT"` in
> `src/content/resume.ts` to pull it from the public site without deleting it.

## Phase 5 — SEO, accessibility, performance

- [x] Per-page metadata with a title template and per-page canonical URLs
- [x] Generated Open Graph images — one for the site, one per project
- [x] `sitemap.ts` (13 URLs, generated from the façade) and `robots.ts`
- [x] JSON-LD `Person` schema on the home page
- [x] Heading hierarchy audited across all seven page types; fixed a
      skipped level on `/projects` (h1 → h3) by making `ProjectCard`'s
      heading level configurable
- [x] `next/image` wherever images render — project galleries, card
      thumbnails, and the hero portrait, added in Phase 9a. Verified against a
      real Blob-hosted file: `/_next/image` serves it re-encoded.
- [x] **Lighthouse ≥ 95 — passed on the home page.** Run against production
      2026-08-24, mobile, Edge DevTools: **Performance 99, Accessibility 100,
      Best Practices 100, SEO 100.** FCP 0.9s, LCP 2.1s, TBT 10ms, **CLS 0**,
      Speed Index 0.9s. Best Practices at 100 means the CSP's `'unsafe-inline'`
      was not flagged.
- [ ] **Lighthouse on the remaining pages** — `/about`, `/experience`,
      `/projects`, a project detail page, `/resume`, `/contact`. Only the home
      page has been measured.
- [x] **The axe audit — RUN, and it found a real bug.** Automated in
      `tests/e2e/accessibility.spec.ts` via `@axe-core/playwright`: WCAG 2.1 A
      and AA across all seven public pages and three admin screens, **in BOTH
      colour schemes**. That closes the light-theme gap in the same stroke —
      Playwright emulates `prefers-color-scheme`, so neither palette depends
      on what the machine happens to be set to any more.
- [x] **Finding: `link-in-text-block`, serious impact, `/about` and
      `/services`, both themes.** Links inside paragraphs were distinguished by
      colour alone, failing WCAG 1.4.1 — and this palette's accent is a warm
      tan on warm ink, one of the harder pairs to tell apart. **Lighthouse
      scored Accessibility 100 on those same pages**, because it runs only a
      subset of axe's rules. That is the entire argument for running axe
      separately, demonstrated rather than asserted. Fixed with a persistent
      underline via `proseLinkStyles`; standalone links are deliberately left
      alone, since position already distinguishes them.
- [ ] Full keyboard navigation pass — needs a human at a keyboard

> **The first Lighthouse run after a deploy is worthless.** The first attempt
> scored Performance 93 with a Speed Index of 7.4s and "Document request
> latency — est. savings 4,680 ms". Nothing was wrong: it was a cold
> serverless start. The warm re-run scored 99 with a Speed Index of 0.9s and no
> latency finding at all. Always discard the first run, and take a median of
> three.

> **Milestone: live portfolio deployed.** Everything after this point is the CMS. If
> momentum ever stops here, the result is still a finished, deployed portfolio.

## Phase 6 — Database

Split in two: everything that does not need a live database is done; the rest is
blocked on a Neon connection string.

- [x] `prisma/schema.prisma` mirroring the Phase 3 types (Prisma 7)
- [x] `prisma.config.ts` — CLI config, takes the DIRECT url
- [x] Prisma singleton in `src/lib/db.ts` — hot-reload safe, takes the POOLED url
- [x] `prisma/seed.ts` importing `src/content/*`, idempotent via upsert
- [x] `db:*` scripts; `prisma generate` wired into `npm run build`
- [x] Generated client excluded from git, ESLint, and Prettier
- [x] Neon project created; `DATABASE_URL` (pooled) and `DIRECT_URL` in `.env.local`
- [x] First migration applied — `20260822052232_init`
- [x] Seeded: profile, 7 projects, 5 experience, 1 education, 28 skills,
      3 social links, 1 resume version
- [x] **Query façade swapped to Prisma — not one component changed.** Verified by
      diffing the prerendered HTML against the file-backed build: identical.
- [ ] Cache invalidation — deferred to Phase 8. There are no mutations yet, so
      there is nothing to invalidate. Pages prerender from the database at build
      time; a row edited directly does not appear until the next deploy.

**Phase 6 complete.** The seam described in `docs/decisions/0004` did exactly what
it was designed to do.

> ⚠ Once the CMS exists in Phase 8, `npm run db:seed` will overwrite rows edited
> through `/admin` with whatever is in `src/content/`. Before then it is the
> source of truth; afterwards it is a reset button.

## Phase 7 — Authentication

- [x] Auth.js v5, Credentials provider, argon2id
- [x] `scripts/create-admin.ts` with a hidden password prompt — no HTTP
      registration route exists anywhere in the codebase
- [x] `/login` page and `/admin` shell
- [x] Layer 1 — `src/proxy.ts` (NOT `middleware.ts`; renamed in Next 16)
- [x] Layer 2 — `auth()` in both the admin layout and the admin page
- [ ] Layer 3 — inside every Server Action. Lands with the Phase 8 mutations,
      which are the first writes that need it.

Verified against a running server:

| Check                                | Result                          |
| ------------------------------------ | ------------------------------- |
| `GET /admin` unauthenticated         | 307 → `/login?callbackUrl=…`    |
| POST credentials with no CSRF token  | 302 → `error=MissingCSRF`       |
| POST with valid CSRF, wrong password | 302 → `error=CredentialsSignin` |
| Session cookie after failed attempts | none issued                     |
| Timing, real vs. nonexistent account | 43 ms vs 37 ms — inside noise   |

The timing result is the dummy-hash defence working. Without it the
nonexistent-account path returns in a few milliseconds and the shared error
message becomes meaningless.

**Rate limiting: closed in Phase 10b.** Ten failures per address per fifteen
minutes, plus a global ceiling, enforced inside `authorize()` — which is the
part worth reading, because the `login` Server Action is the wrong place for it
and Auth.js's own endpoint is why. See `docs/decisions/0010`.

## Phase 8 — Admin CMS

Split in two so the pattern is proven on one entity before it is repeated.

- [x] Admin shell, section navigation, sign-out
- [x] Dashboard with counts that include drafts
- [x] **Projects: full CRUD** — list, create, edit, delete, publish toggle
- [x] Server Actions: `requireAdmin()` → Zod parse → mutate → revalidate
- [x] Draft/publish toggle and sort ordering
- [x] `revalidatePath` on every mutation, including `/projects/[slug]` with
      `type: "page"` and `/sitemap.xml`
- [x] **Layer 3 verified** — see below
- [x] Experience, Education, Skills, Profile modules — same pattern repeated
- [x] `FormShell` extracted so every form gets error focus and "not saved"
      messaging by construction, after a real bug where a rejected save was
      indistinguishable from a successful one

**Phase 8 complete.** Every content type is editable at `/admin` without touching
code — which was the founding requirement of this project.

Skills route by `id` rather than name: skill names are not slugs ("HTML/CSS"
contains a slash), and routing by id also lets a skill be renamed freely.

### Auditing the auth guard

Every mutating Server Action must call `requireAdmin()` as its first statement.
To re-check after any change:

```powershell
Get-ChildItem src/server/actions -Filter *.ts | ForEach-Object {
  [regex]::Matches((Get-Content $_.FullName -Raw),
    '(?s)export async function (\w+)\s*\([^)]*\)[^{]*\{(.*?)\n\}')
}
```

Last run (Phase 9b): 24 mutating actions, 21 guarded. **Three are unguarded on
purpose** and any fourth is a bug:

- `login` and `logout` in `auth.ts` — the authentication endpoints themselves.
- `submitContactMessage` in `actions/contact.ts` — the public contact form. A
  contact form that requires you to be the site's owner is not a contact form.
  Its boundary is a honeypot, a timing check, length-capped validation, and a
  database-backed rate limit. See `docs/decisions/0008`.

The admin-only inbox actions live in `actions/contact-admin.ts`, separate from
the public one, so that the unguarded file stays short enough to read in full.

### Layer 3 verification

The security claim that matters is that a Server Action cannot be invoked
without a session. Tested rather than asserted: action IDs were extracted from
`.next/server/server-reference-manifest.json` and POSTed to `/admin/projects`
against a production build with no session cookie.

|                                       |                              |
| ------------------------------------- | ---------------------------- |
| 4 action invocations, unauthenticated | all returned **307**         |
| Project rows before                   | 7, all PUBLISHED             |
| Project rows after                    | 7, all PUBLISHED — unchanged |

Nothing was published, unpublished, or deleted. Repeat this test if the auth
flow is ever refactored; it is the only check that exercises the boundary the
proxy cannot see.

## Phase 9 — Media and contact

Split in two, like Phases 6 and 8: media first, contact second. They share almost
no code, and only the media half needs a real file round-trip verified.

### Phase 9a — Media

- [x] Vercel Blob behind a storage façade (`src/lib/storage.ts`) — no other
      module imports `@vercel/blob`. See `docs/decisions/0007`.
- [x] `ProjectImage` model, migration `20260823005742`, gallery CRUD in
      `/admin/projects/[slug]`
- [x] Public gallery on project pages; first image is the card thumbnail on
      Home and Projects
- [x] `next/image` with `remotePatterns` scoped to Blob subdomains
- [x] Resume upload, `/admin/resume`, publish toggle and "make current"
- [x] Uploads validated by magic bytes, not filename or declared type; SVG
      refused deliberately
- [x] Profile photo — `Profile.photoUrl`, uploaded at `/admin/profile`, shown
      in the home hero and added to the `Person` JSON-LD as `image`. Migration
      `20260823041431`. The seed leaves it untouched on update, so
      `npm run db:seed` cannot silently wipe an uploaded portrait.
- [x] **Verified against a real Blob store** — see below.
- [ ] Upload the actual project screenshots and profile portrait at `/admin`.
      Needs Bidipta; the files themselves are content, not code.

### Phase 9b — Contact

- [x] `ContactMessage` model, migration `20260823055253`
- [x] Contact form on `/contact`, alongside the mailto rather than replacing it
- [x] Resend behind an email façade (`src/lib/email.ts`); notification sent in
      `after()` so nobody waits on it
- [x] **The database is the record, email is a notification** — a message is
      never lost to a mail outage, and the dashboard counts any that were
      saved without being emailed. See `docs/decisions/0008`.
- [x] Honeypot, minimum fill time, and a database-backed rate limit keyed on a
      salted IP hash. No Redis, and no captcha.
- [x] `/admin/messages` inbox — read/unread, delete, reply-by-mailto
- [x] `RESEND_API_KEY` set locally; a real notification was accepted by
      Resend and `notifiedAt` stamped through the live form.
- [x] **Delivery confirmed, not just acceptance.** Both test notifications
      landed in the registered inbox (confirmed by Bidipta, 2026-08-24).
      This needed checking separately because with no verified domain,
      Resend delivers only to the address the account was registered with
      and drops anything else after a successful-looking API call.
- [x] `RESEND_API_KEY` added to the **Vercel** project, Production and Preview,
      confirmed in the dashboard beside the other five variables. **Phase 9 is
      closed.** One caveat kept deliberately: the variable is present and a
      deployment carrying it is live, but no message has been submitted through
      the _production_ form since — so this is verified to the same standard as
      the other five env vars, not to the standard of the local delivery test
      above. Sending one real submission through the live form would close that
      last inch.

Verified against the running application, driving the real Server Action over
HTTP the way a browser with JavaScript disabled does:

| Check                                                         | Result |
| ------------------------------------------------------------- | ------ |
| A genuine submission is stored, unread, with a 64-char hash   | pass   |
| A filled honeypot writes nothing                              | pass   |
| A submission on page-load writes nothing                      | pass   |
| An invalid email writes nothing                               | pass   |
| With no key: saved, failure logged, `notifiedAt` left null    | pass   |
| With a key: `notifiedAt` stamped via `after()` after response | pass   |
| 5th message in an hour from one sender is blocked             | pass   |
| A different sender is unaffected by that block                | pass   |
| Sender allowed again once messages age out of the window      | pass   |
| A sender with no resolvable IP is allowed, not punished       | pass   |
| Over-long, too-short, and malformed input rejected            | pass   |

All test rows were deleted; the table is empty.

### What is verified, and what is not

With a real store connected, a full round trip was exercised: upload through
`uploadFile()`, fetch back over HTTP, then delete.

| Check                                                      | Result |
| ---------------------------------------------------------- | ------ |
| Uploaded file fetched back, bytes and content-type intact  | pass   |
| `downloadUrl` responds `content-disposition: attachment`   | pass   |
| Deleted file returns 404 afterwards                        | pass   |
| Hostile pathname `../../../etc/pa ss wd?.png` sanitised    | pass   |
| Home hero renders a Blob URL through `next/image`          | pass   |
| `/_next/image` optimizes the remote file (200, re-encoded) | pass   |
| `Person` JSON-LD carries `image` when a photo exists       | pass   |

The test image was deleted from the store and the profile row reset; nothing
from these checks remains.

Everything that does not require a token was exercised separately, with real
PNG and JPEG files and hand-built WebP headers:

| Check                                                  | Result |
| ------------------------------------------------------ | ------ |
| PNG, JPEG, WebP (VP8 and VP8L) dimensions parsed       | pass   |
| Non-image returns null instead of throwing             | pass   |
| SVG renamed `.png`, declared `image/png`, is refused   | pass   |
| PDF bytes refused where an image is expected, and back | pass   |
| Empty and oversized files refused                      | pass   |
| A real PNG passes every check and reaches the upload   | pass   |
| Auth guard: 17 of 19 actions call `requireAdmin()`     | pass   |

The two unguarded actions are `login` and `logout` in `auth.ts`, which are the
authentication endpoints themselves and correctly are not guarded.

**Not verified:** the admin screens rendered while signed in — every check
above went through the actions and queries directly, or through a public page.
That gap is still open; it is Playwright's job in Phase 10b.

The checks themselves no longer live only in scratch scripts: Phase 10a ported
the storage and contact ones into `tests/unit/`, where they run on every commit.
The two that could not be ported are the ones that need a real Blob store and a
real mail provider — the round trip in the table above, and the notification
that reached the inbox.

## Phase 10 — Testing and hardening

Split in two: the unit suite and the audit first, then the browser-driven half,
which needs a running server and a real Chromium.

### Phase 10a — Unit suite and dependency audit

- [x] Vitest, node environment. **No jsdom and no React Testing Library** — the
      Next.js guide recommends both, and neither earns its keep here: Vitest
      cannot render an async Server Component, which is nearly every page in
      this app. See `docs/decisions/0009`.
- [x] `server-only` aliased to the package's own empty build, so modules under
      `src/server/` are testable without turning the `react-server` condition
      on globally.
- [x] Validation units — `normalizeYearMonth` across every format a person
      actually types, the contact form's length caps, the current/endDate rule,
      and the resume filename regex.
- [x] **Query façade: a sweep asserting no public read can reach the database
      without `status: "PUBLISHED"`**, plus a companion test that enumerates the
      façade's exports and fails if one is missing from the sweep. `admin.ts`
      excluded on purpose — its reads include drafts.
- [x] **Phase 9a storage checks ported** — magic-byte rejection (including an
      SVG renamed `.png` and declared `image/png`), the empty and oversized
      cases, pathname sanitisation, content type derived from bytes rather than
      the client's header, and header dimension parsing for PNG, JPEG and all
      three WebP sub-formats.
- [x] **Content validation test** — every collection imported unconditionally,
      so a collection no page reaches is still validated. A second test reads
      `src/content/` off disk and fails if a file there is missing from that
      import list. This closes the gap that let a planted duplicate slug in
      `education.ts` build green.
- [x] **Phase 9b contact checks ported** — rate-limit windows per sender and
      global, the ordering of the two counts, the no-address case, and the
      length caps. Driven through `evaluateContactRateLimit`, which exists so
      the decision can be exercised without a request.
- [x] **Dependency audit clean** — `npm audit` reported three high-severity
      advisories, all `deepmerge-ts < 8` via `prisma` → `@prisma/config`.
      Prisma 7.9.1 pins the vulnerable version and `npm audit fix --force`
      "fixes" it by installing Prisma 6. Overridden to `^8` instead and the
      CLI verified under it. See `docs/decisions/0009`, which also says when to
      remove the override.

151 tests at the close of 10a — 187 once the login rate limit brought its own. No
database, no network, no Blob token, under a second.

**Verified by mutation, not by going green.** Dropping the `PUBLISHED` filter
from `getProjects` and adding an SVG signature to the accepted image types each
failed exactly one test — the right one — and nothing else. Repeat that check
when adding an invariant here; a test that has never been seen to fail is not
yet evidence of anything.

### Phase 10b — Browser, CI, and hardening

- [x] **GitHub Actions CI** — `.github/workflows/ci.yml`. Runs the commit gate
      (generate → typecheck → lint → format:check → test) and then does the one
      thing no developer machine does: applies the committed migrations to an
      **empty** Postgres, seeds it, and builds against it. Locally those
      migrations were applied one at a time, months apart, to a database that
      already held the previous state. This is the check that would have caught
      the three-phase Vercel failure.
- [x] **Security headers and CSP** — `src/lib/security-headers.ts`, applied to
      every response from `next.config.ts` (not the proxy, which is scoped to
      `/admin` on purpose). CSP, HSTS, `nosniff`, `Referrer-Policy`,
      `X-Frame-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
      Verified against real responses from `npm start`, and the policy is
      unit-tested.
- [ ] 🔴 **CI is currently RED and the cause is unknown.** Run #2 (commit
      `9916332`, 2026-08-24) failed after 2m31s. Run #1 was green, so the
      failure arrived with the Playwright commit — most likely the new
      **End-to-end** job, which had never executed anywhere before that push.
      **The log has not been read.** There is no `gh` CLI on this machine, so
      diagnosing it needs someone to open the run in a browser. Deliberately
      deferred rather than guessed at; likely candidates are the 5-minute
      `webServer` timeout against a cold CI build, or the Chromium/Postgres
      setup in the job.
- [ ] **Branch protection on `main`** — needs the GitHub dashboard; there is no
      `gh` CLI on this machine. Require a PR, and require **both** the `Verify`
      and `End-to-end` checks. **Blocked:** GitHub cannot offer a check as
      required until it has seen it pass at least once, and `End-to-end` has
      never passed. Fix CI first.
- [x] **Playwright installed and configured** — Chromium only, against a
      production build (`npm run e2e`). Four specs written: the auth boundary,
      every admin screen signed in, create → publish → appears publicly, and a
      CSP check in a real browser. `.github/workflows/ci.yml` runs them in a
      second job against a throwaway Postgres.
- [x] **Suite run and green — 13 tests, ~40s**, against a dedicated Neon branch
      (`e2e`). Three genuine failures on the first two runs, all worth having:
      `getByRole("alert")` also matches Next's `__next-route-announcer__` on
      every page; the cleanup hook re-ran `signIn()` on a page that already had
      a session and hung waiting for a login form that redirects away; and the
      unpublish assertion, below.
- [x] **The admin screens rendered while signed in — closed.** All 12 static
      admin routes plus the four edit screens, reached by clicking the lists so
      the links are tested too. Every automated check before this drove actions
      and queries directly, or read a public page; none had ever rendered an
      admin screen.
- [x] **Verified by mutation.** Removing `revalidateProjectPaths()` from
      `setProjectStatus` turned `publish.spec.ts` red and nothing else, then was
      reverted. The suite is therefore known to test revalidation rather than
      merely to exercise it.

> **Finding: unpublishing is not instantaneous.** The first request to
> `/projects/[slug]` after unpublishing returns 200 with the stale page; every
> one after returns 404. Identical via a raw fetch, so it is Next's
> stale-while-revalidate, not the browser cache. One visitor can still see a
> project after it is taken down. Accepted, documented in `CLAUDE.md`, and the
> spec polls rather than asserting on the first response — asserting otherwise
> would encode a promise Next does not make.

- [ ] Edge rate limiting — in front of the database-backed limit in
      `src/server/rate-limit.ts`, not replacing it
- [x] **Login rate limiting** — the gap Phase 7 flagged as the largest in the
      auth surface. Ten failures per address per fifteen minutes plus a global
      ceiling, enforced **inside `authorize()`**, because Auth.js accepts
      credentials at its own route and a limit in the `login` Server Action is
      one an attacker walks around. Verified by posting fifteen wrong passwords
      straight to `/api/auth/callback/credentials`, bypassing the action: ten
      recorded, five refused, a second address unaffected, and the stored
      identifiers 64-character hashes rather than addresses. A refused attempt
      is deliberately **not** recorded — otherwise an attacker holds the window
      open forever and the lockout becomes theirs to control. See
      `docs/decisions/0010`.
- [x] **Lighthouse ≥ 95 — met.** 99/100/100/100 against production. Details and
      the cold-start caveat are recorded under Phase 5, with the remaining
      pages, the axe extension scan, and the light-theme pass still open there.
- [ ] **Confirm no CSP violations in a browser console.** The policy was
      verified by auditing the built markup — every off-origin reference, every
      inline script, every style attribute — but not by loading a page in a real
      browser. `tests/e2e/security-headers.spec.ts` now automates exactly this,
      across the six public routes and four admin ones, and fails on any
      console error matching a CSP refusal or a blocked request. It closes this
      item **once it has run** — which is the same blocker as the rest of the
      suite. Still worth one manual look at the preview deployment, because the
      spec only visits pages it knows about.
      **Ran green on the first attempt** across `/`, `/about`, `/experience`,
      `/projects`, `/resume` and `/contact`, plus four admin screens — so the
      Phase 10b audit of the built markup was correct, including the two
      deliberate deviations below. What remains is a human looking at a preview
      deployment, since the spec only knows the pages it was told about.

#### Branch protection should require both checks

CI now has two jobs: **Verify** (the commit gate, plus migrate-seed-build against an
empty database) and **End-to-end**. The branch protection rule described below
was written when there was only one; require both.

#### What the CSP audit found, and why it is not the textbook policy

Two directives deviate from the usual recommendation, both deliberately, and
both are now regression-tested because both look like mistakes:

- **`object-src` is not `'none'`.** `/resume` embeds the PDF in an
  `<object data={fileUrl}>` — chosen over an iframe because it degrades to its
  children where a browser cannot render a PDF inline. `'none'` would blank the
  preview. `frame-src` matches it, because browsers disagree about which
  directive governs a PDF object.
- **`style-src` keeps `'unsafe-inline'` despite there being no inline
  stylesheet.** Zero `<style>` tags exist in the built markup, so the token
  looks like dead permissiveness. It is not: `next/image` emits a
  `style="position:absolute;…"` **attribute** on the fill image used for the
  home page's hero portrait, and CSP governs style attributes here too.

`script-src` keeps `'unsafe-inline'` because a nonce would force dynamic
rendering on every page, undoing the prerendering this site is built around.
The home page carries 6 inline scripts (Next's hydration payload plus the
JSON-LD block) and 11 external ones, all same-origin. No off-origin script host
is permitted, so an injected `<script src>` is still refused. The upgrade path
that keeps prerendering is Next's experimental `experimental.sri`; it is left
off until it leaves experimental. Full reasoning in `src/lib/security-headers.ts`.

#### Branch protection — a dashboard step

GitHub → Settings → Branches → Add rule for `main`: require a pull request, and
require the **Verify** status check. Worth doing only after the first CI run has
appeared, since a check cannot be required until GitHub has seen it once.

## Phase 11 — Production

- [x] **Migration flow in the build step** — `scripts/vercel-build.mjs`, wired in as a
      `vercel-build` script, which Vercel prefers over `build`. Applies pending
      migrations and then builds. `npm run build` is untouched, so a developer or CI
      building something never migrates as a side effect.
- [x] **Migrations gated on `VERCEL_ENV=production`.** Preview deployments run this
      script too, and Vercel's default variable scope is "Production and Preview" — so
      without the gate, one mis-scoped variable means opening a pull request migrates
      production, ahead of review and ahead of the code needing it. Verified for
      `production`, `preview`, and unset: only production migrates, and unset fails
      safe. See `docs/decisions/0012`.
- [ ] **Split the database per environment — CODE DONE, DASHBOARD PENDING.** Three Neon
      branches: `production` (Vercel, Production scope only), `development`
      (`.env.local`), `e2e` (already exists). Until the `development` branch exists and
      `.env.local` points at it, `npm run db:seed` still reverts the live site to
      whatever is in git and `npm run db:reset` still destroys it. **This is the item
      that actually removes the risk; the code above only prepares for it.**
- [ ] Re-scope the Vercel variables: `DATABASE_URL` and `DIRECT_URL` to **Production
      only**, with Preview pointed at `development`. Not load-bearing — the
      `VERCEL_ENV` gate covers the dangerous case — but it stops preview deployments
      reading and writing live content.
- [x] **Analytics — Vercel Analytics and Speed Insights**, rendered only when
      `VERCEL === "1"`. **No CSP change**, which was the point: in production both
      load from same-origin `/_vercel/…` paths that Vercel proxies. The off-origin
      debug host appears in the bundle but sits behind `isDevelopment()`, which
      compiles to a permanently false comparison once Next inlines `NODE_ENV` —
      verified by reading the emitted chunk. Cookieless, so no consent banner.
      `docs/decisions/0014`.
- [ ] **Error monitoring — deliberately deferred, and the gap is real.** Analytics
      answers "is anyone visiting and is it fast", not "did it break". A Server
      Action throwing for a visitor still produces nothing but a function log
      nobody reads. Sentry was rejected for now on bundle size, a `connect-src`
      entry, and third-party session data — see 0014 for the reasoning and for
      what would change it.
- [x] **`npm run verify:deploy`** — checks a deployment is internally consistent about its
      own origin, not merely up. Written before the domain move, because that move's
      failure mode is silent: if `NEXT_PUBLIC_SITE_URL` lags the domain, every page returns
      200 while every canonical tag, the sitemap, robots and both OG images still name the
      old origin, and search engines see two identical sites. Verified both ways — 21/21
      against production, 10 failures and exit 1 against a different origin.
- [x] **Custom domain — `bidiptaroy.com` is LIVE**, bought through Vercel and verified
      2026-08-24. The code needed no change at all: `getSiteUrl()` was written for this in
      Phase 1 and there is no hard-coded origin anywhere in `src/`. **21 of 22 checks pass**
      — all seven routes, every canonical, all 14 sitemap URLs, `og:image`, `robots.txt`,
      and the security headers.

> **The move demonstrated precisely the failure `verify:deploy` exists to catch.** Between
> attaching the domain and redeploying, `bidiptaroy.com` returned **200 on all seven routes
> while every canonical tag, the `og:image`, all 14 sitemap URLs and `robots.txt` still
> named the old `*.vercel.app` address.** Nothing errored; "does the site load" would have
> passed it. `NEXT_PUBLIC_*` is inlined into the bundle at build time, so the variable does
> nothing until a rebuild. That is the step never to skip.
>
> A second snag worth recording: `NEXT_PUBLIC_SITE_URL` had originally been created as a
> Vercel **Secret**, and a `NEXT_PUBLIC_` value cannot be secret — Next compiles it into the
> client bundle by definition. Vercel refuses the combination, and a saved secret cannot be
> converted, so it had to be **deleted and recreated as type Config**.
>
> Scope is **Production only**, which is better than Production-and-Preview: previews then
> fall through to `VERCEL_PROJECT_PRODUCTION_URL`, which is exactly the fallback
> `src/lib/site.ts` documents, so a preview build never emits canonicals pointing at itself.

- [x] **The old `*.vercel.app` URL now 308s to `bidiptaroy.com`.** Set in Vercel →
      Domains → Edit → Redirect to Another Domain. **308 rather than 307 on purpose**: a
      permanent redirect tells search engines to transfer the old URL's accumulated ranking
      signals, where a temporary one would leave them treating the `.vercel.app` address as
      the real home. The trade is that browsers cache a 308 hard, so it is not a setting to
      flip casually — correct for a genuine permanent move, which this is.

**Phase 11 complete. `npm run verify:deploy` reports 22/22.**

- [ ] **Resend still sends from `onboarding@resend.dev`** and delivers only to the
      registered address. Owning the domain makes verification possible, which would let
      contact notifications come from an address at `bidiptaroy.com` and reach anyone.
      Worth doing; not urgent while Bidipta is the only recipient.

## Phase 12 — Services and referral

### Phase 12a — The services area

- [x] `(services)` route group and `/services` page, driven by the query façade
- [x] `Service` and `ReferralLink` models, migration `20260825003655`, seeded
- [x] Services CMS module — `/admin/services`, with referral links on the same
      page rather than a nav entry of their own for one row
- [x] `/r/[slug]` redirect, resolving from the database. An unknown or retired
      slug goes to `/services` rather than 404 — whoever followed it was, a
      moment ago, a prospective client
- [x] Referral links as data, promo code included. `TSKGXDEV` appears in no
      component
- [x] **Absent from the main nav, and tested.** Reached from the footer and
      About; indexed and directly linkable. `docs/decisions/0013` records the
      reasoning and the **stated trigger** for promoting it into the header —
      written down so that promoting it is a decision rather than a drift
- [x] **No rate is quotable.** No `price` column, and two tests — one on the
      seed source, one on the rendered page. Both seen to fail against a
      planted `$50 per hour`
- [x] e2e coverage: footer entry point, the three services, the `/r/` hop and
      its promo code, and the unknown-slug fallback. 19 tests green
- [ ] Optional click tracking (hashed IP, no cookies) — the seam is cut and
      unused. One insert in `src/app/r/[slug]/route.ts` when it is wanted

**Phase 12a complete.** The content is Bidipta's own description of the work, and
deliberately carries no rates, no availability claims, and no testimonials — the same
standard that dropped an unverifiable stat bar in Phase 3.

**Production deliberately runs with NO service rows — decided by Bidipta, 2026-08-24.**
Only the referral link is published there. The reasoning is sound and worth keeping: the
Taskrabbit profile lists the work, the rates, and the availability, and it is always
current, whereas a second copy on this site would go stale silently. One source of truth
beats two.

Two consequences follow, and both are handled rather than left to chance:

- The public page's zero-services copy was rewritten to read as **finished** rather than
  as waiting for content. Its earlier wording — "Services are not listed yet" — sat
  directly above a live promo code and made a deliberate choice look like an unfinished
  page.
- **The seasonal coverage area is not shown publicly.** It lives on `Service.serviceArea`,
  so with no service rows there is nowhere for it to render. That detail is genuinely
  useful to a client — it answers "do you cover where I am, when I need it" — and it is
  currently only in `src/content/services.ts` and this roadmap. If it should be public,
  the cheapest home is the referral link's `description` at `/admin/services`, which is
  already editable and already renders above the booking button.

`src/content/services.ts` therefore seeds development only, and stays as the record of the
agreed wording. Adding services at `/admin/services` swaps the fallback for the cards with
no other change.

### Phase 12b — Growing it into a business _(future)_

Bidipta's stated intent is to expand this into a service-based business. Things that
would matter then, none of which should be invented for him:

- [x] **Rates — resolved by pointing, not quoting.** They live on the Taskrabbit
      profile, are always current there, and are one click away via the referral
      link. Nothing is restated on this site, because a copied figure goes stale
      silently while the client is charged something else. The no-rate tests
      stay: pointing at rates is not quoting one.
- [x] **Coverage area — supplied 2026-08-24 and now accurate.** NYC excluding the
      Bronx plus all of Long Island, May 10 – August 31 and again roughly
      December 19 – January 18; Boston, MA otherwise. Stored in `serviceArea`
      so the dates are a CMS edit each year. This also corrected a real
      overstatement: "Greater New York" included the Bronx, which is not covered.
- [ ] Travel policy — whether he travels beyond those areas, and on what terms
- [ ] Availability within a season — currently fitted around classes, which is a
      real constraint a client booking a moving day would want stated
- [ ] Testimonials or completed-job counts, if Taskrabbit exposes them verifiably
- [ ] Per-service detail pages, once a service has more to say than a card holds
- [ ] Whether the nav trigger in `docs/decisions/0013` has fired

### Supplied by Bidipta, 2026-08-24 — for whoever picks this up

- **Taskrabbit profile:** https://tr.co/bidipta-r
- **Promo code:** `TSKGXDEV`

Both are public-facing by nature — a referral link and a promo code exist to be
shared — so they are recorded here rather than treated as secrets. They are
content, though, not configuration: when Phase 12 starts they belong in the
database behind the CMS like everything else, editable at `/admin` without a
deploy. A promo code hard-coded into a component is a promo code that expires
and needs a developer.

⚠ **Terminology, which is non-negotiable and easy to get wrong here.**
Taskrabbit is a _platform through which services are provided_, never an
employer. Render as "via Taskrabbit". The `Experience` model already enforces
this by keeping `platform` separate from `organization`, and
`tests/unit/content.test.ts` fails if "Taskrabbit" ever appears in the
`organization` field. The same care applies to any services page: it describes
Bidipta's own independent work, with Taskrabbit as the channel.

The Taskrabbit engagement dates that were outstanding here are **supplied and
live** — see Phase 3. What this area still needs from Bidipta rather than
invention is anything that makes a claim: rates, guaranteed availability,
service radius, and testimonials. None of those may be written for him.

**Intent, in his words (2026-08-24):** he plans to expand this into a
service-based business, so the services area is not a footnote to the
portfolio — it is the seed of a second product. Build it as data behind the
CMS from the start, on the same reasoning the promo code is not hard-coded.

---

## Checkpoint protocol

After every meaningful task: verify the result → run typecheck, lint, build, tests →
inspect for errors → summarize what changed → explain notable decisions → state the next
task → **stop at phase boundaries for approval**.

**And at every phase boundary, confirm the deployment succeeded.** Not that the push
happened — that the build went green and a route added in that phase answers in
production:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://bidiptaroy.com/login
```

This exists because Phases 6, 7 and 8 all built cleanly locally, pushed successfully, and
failed on Vercel — the project had no `DATABASE_URL`, and public pages prerender from the
database. Vercel serves the last successful build when a new one fails, so the site looked
healthy while running three phases behind. Discovered during Phase 9a, when `/login`
returned 404 in production. Fixed by adding `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`
and `BLOB_READ_WRITE_TOKEN` to the Vercel project.
