# Development Roadmap

Eleven phases. Each is independently reviewable, mergeable, and deployable. **One phase per
working block, with a stop-and-review checkpoint at the end.** No phase is attempted in a
single operation.

**Phase 10a complete. Current phase: 10b — Playwright, CI, and hardening.** The CMS is live,
every content type is editable at `/admin`, media uploads to Vercel Blob, the contact form
accepts, stores, and emails messages, and 151 unit tests now guard the checks that were
previously run once from scratch scripts. Outstanding from 9b: `RESEND_API_KEY` exists
locally but **not yet in the Vercel project**, so production saves messages without
notifying.

Live: https://portfolio-ten-theta-d09qbq67e8.vercel.app

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

- [ ] **Taskrabbit dates.** Omitted entirely rather than guessed. Must be added as
      `PLATFORM_ENGAGEMENT` / `platform: "Taskrabbit"` / `organization: null`.
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
- [ ] **Lighthouse ≥ 95 and an axe audit — NOT RUN.** Both need a real
      browser, which is not available in this environment. Must be run
      manually (Chrome DevTools → Lighthouse) before launch.
- [ ] Full keyboard navigation pass — needs a human at a keyboard

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

**Still missing: rate limiting.** Nothing currently stops thousands of guesses.
That is Phase 10, and it is the largest remaining gap in the auth surface.

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
- [ ] Add `RESEND_API_KEY` to the **Vercel** project. Until it is there,
      production stores messages and emails nothing — the dashboard and inbox
      both say so, but only if someone looks. **The last open item in Phase 9,
      and it is a dashboard paste, not a code change.**

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

151 tests, no database, no network, no Blob token, under a second.

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
- [ ] **Branch protection on `main`** — needs the GitHub dashboard; there is no
      `gh` CLI on this machine. Require the `Verify` check above, and require a
      PR. See the note at the end of this phase.
- [ ] Playwright e2e: login, and create → publish → appears publicly
- [ ] **The admin screens rendered while signed in** — still covered by nothing
      but manual use. Every automated check to date drives actions and queries
      directly, or reads a public page. This is the largest remaining test gap.
- [ ] Edge rate limiting — in front of the database-backed limit in
      `src/server/rate-limit.ts`, not replacing it
- [ ] **Login rate limiting** — nothing currently stops thousands of password
      guesses. Flagged in Phase 7 as the largest gap in the auth surface and
      still open.
- [ ] Lighthouse ≥ 95 and an axe audit — carried over from Phase 5; both need a
      real browser, which Phase 10b is where one arrives.
- [ ] **Confirm no CSP violations in a browser console.** The policy was
      verified by auditing the built markup — every off-origin reference, every
      inline script, every style attribute — but not by loading a page in a real
      browser. Do this on the preview deployment before it reaches production.

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

- [ ] Production environment variables and database
- [ ] Migration flow in the build step
- [ ] Error monitoring, analytics
- [ ] Custom domain and DNS — **low priority, genuinely last**

## Phase 12+ — Services and referral _(future, separate planning session)_

- [ ] `(services)` route group and pages
- [ ] Services CMS module
- [ ] `/r/[slug]` redirect
- [ ] Referral links as data
- [ ] Optional click tracking (hashed IP, no cookies)

---

## Checkpoint protocol

After every meaningful task: verify the result → run typecheck, lint, build, tests →
inspect for errors → summarize what changed → explain notable decisions → state the next
task → **stop at phase boundaries for approval**.

**And at every phase boundary, confirm the deployment succeeded.** Not that the push
happened — that the build went green and a route added in that phase answers in
production:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://portfolio-ten-theta-d09qbq67e8.vercel.app/login
```

This exists because Phases 6, 7 and 8 all built cleanly locally, pushed successfully, and
failed on Vercel — the project had no `DATABASE_URL`, and public pages prerender from the
database. Vercel serves the last successful build when a new one fails, so the site looked
healthy while running three phases behind. Discovered during Phase 9a, when `/login`
returned 404 in production. Fixed by adding `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`
and `BLOB_READ_WRITE_TOKEN` to the Vercel project.
