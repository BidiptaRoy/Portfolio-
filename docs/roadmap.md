# Development Roadmap

Eleven phases. Each is independently reviewable, mergeable, and deployable. **One phase per
working block, with a stop-and-review checkpoint at the end.** No phase is attempted in a
single operation.

**Current phase: 9 — Media and contact.** Phases 1–8 complete: the CMS is live and
every content type is editable at `/admin`.

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
- [ ] Project screenshots (Phase 9, needs upload support)

## Phase 4 — Public portfolio

- [x] Home — hero, featured projects, technical experience strip, contact prompt
- [x] About — narrative, education, skills, social links, services pointer
- [x] Experience — three sections from `Experience.kind`; empty ones are omitted
- [x] Resume — download, new-tab, and inline preview; degrades when unpublished
- [x] Projects index with technology filtering, driven by `?tech=` in the URL
- [x] Project detail `[slug]` — prerendered per project; Outcomes, Challenges,
      and My role are omitted entirely when empty
- [x] Contact — mailto and social links; the form is Phase 9

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
- [ ] `next/image` throughout — no images exist yet; lands with Phase 9
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

Last run: 10 of 10 mutating actions guarded. `login` and `logout` in `auth.ts`
are the authentication endpoints themselves and correctly are not.

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

- [ ] Vercel Blob; project image upload
- [ ] Resume upload and `ResumeVersion`
- [ ] Contact form → Resend + `ContactMessage`
- [ ] Spam protection and rate limiting

## Phase 10 — Testing and hardening

- [ ] Vitest units (validation, query façade)
- [ ] **Content validation test** — import every collection unconditionally and
      assert it parses. Content schemas currently run only at module import, so
      a collection no page reaches is never validated. Verified by planting a
      duplicate slug in `education.ts`: the build passed. See
      `src/lib/validation/content.ts`.
- [ ] Playwright e2e: login, and create → publish → appears publicly
- [ ] GitHub Actions CI; branch protection on `main`
- [ ] Rate limiting, security headers, CSP
- [ ] Dependency audit

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
