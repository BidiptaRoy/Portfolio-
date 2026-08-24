# CLAUDE.md

Engineering instructions for this repository. Read this first, then `docs/architecture.md`
for depth and `docs/decisions/` for the reasoning behind anything that looks unusual.

**This file describes what exists today.** Anything not yet built is marked _(future)_ and
lives in `docs/roadmap.md`. If this file and the code disagree, the code is right and this
file is a bug — fix it.

@AGENTS.md

---

## What this is

The personal portfolio and professional site of **Bidipta Roy** (Computer Science, Boston
University). It is deliberately a full-stack application rather than a static page, because
its long-term job is to let portfolio content be **edited as data through an admin CMS**
instead of by editing React components.

A second audience exists alongside recruiters: prospective clients for independent
professional services offered via Taskrabbit. That area is planned but not built.

- **Live URL:** https://portfolio-ten-theta-d09qbq67e8.vercel.app
- **Current phase:** Phase 11 started, **with Phase 10b deliberately left open.** Phases
  1–8 built the CMS; 9a put project galleries, the profile portrait, and resume revisions
  on Vercel Blob; 9b added the contact form, its inbox, and its spam defences; 10a added
  the Vitest unit suite; 10b added CI, the security headers, login rate limiting, a green
  13-test Playwright suite, and Lighthouse 99/100/100/100.
  **Open in 10b:** 🔴 CI is red on the End-to-end job and its log has not been read, so
  branch protection is blocked; the axe scan and the light-theme accessibility pass are
  also outstanding. **In progress in 11:** the database split — the code is done, the Neon
  and Vercel dashboard steps are not. See `docs/roadmap.md`.

Deployment is continuous, not a final step: `main` auto-deploys to the URL above, and pull
requests get their own preview deployments.

> **A green build locally is not a deployment.** Phases 6, 7 and 8 all shipped to GitHub and
> all failed to build on Vercel, for want of `DATABASE_URL` in the project's environment —
> public pages prerender from the database, so the build reaches Postgres. Vercel keeps
> serving the last successful build at the production URL, so the site looked fine while
> being three phases stale. It was caught only when `/login` turned out to 404 in production.
>
> **Every environment variable this app reads must exist in the Vercel project**, not only in
> `.env.local`: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`,
> `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`. All six are present as of 2026-08-24. Paste
> values WITHOUT the surrounding quotes — those are dotenv syntax, and the dashboard
> stores the literal string.
>
> `E2E_DATABASE_URL` and `E2E_DIRECT_URL` are the exception and must **never** be added
> there: they are local-only, and the e2e suite is not something a deployment runs.
>
> **At every phase boundary, check that the deployment actually succeeded** and that a route
> added in that phase responds in production. That check is what three phases went without.

---

## Architecture at a glance

A **modular monolith** — one Next.js app, one deployment. Not a separate frontend and
backend; Server Components read data, Server Actions write it.

One database _schema_, but since Phase 11 **three databases**, as Neon branches:
`production` (Vercel only), `development` (`.env.local`), and `e2e` (the Playwright suite).
See `docs/decisions/0012`.

```
Public routes (Server Components, cached)
      └── src/server/queries/*   ← READ FAÇADE. Pages call these, never a data source.
/admin
      └── src/server/actions/*   ← WRITE LAYER. Auth check, then Zod parse, then mutate.
              └── src/lib/storage.ts  ← STORAGE FAÇADE. Files, never a provider SDK.
```

**The single most important convention in this repo:** pages and components never import
content or call the database directly. They call a function in `src/server/queries/`.

Those functions returned typed data from `src/content/` through Phase 5, and were swapped
to Prisma in Phase 6 **without a single component changing**. Do not bypass this seam.

`src/content/` is now the **seed source, not the runtime source.** Editing a file there
changes nothing on the site until `npm run db:seed` runs.

**Rendering and staleness:** public pages are prerendered at build time from the database.
An edit made through `/admin` appears immediately, because every mutation revalidates the
paths built from it — see `src/server/revalidate.ts`. A row edited **directly** in the
database bypasses that and does not appear until the next deploy.

**"Immediately" means the next request but one.** Measured in Phase 10b against a
production build: after unpublishing a project, the first request to `/projects/[slug]`
still returns **200 with the stale page**, and every request after it returns 404. The same
holds via a raw fetch, so it is not the browser's cache — it is Next serving an invalidated
page once more while regenerating behind it. Exactly one visitor can see a project after it
is taken down. That is accepted, and `tests/e2e/publish.spec.ts` polls rather than
asserting on the first response, because asserting otherwise would encode a promise the
framework does not make.

Full reasoning: `docs/architecture.md`. Decisions: `docs/decisions/`.

---

## Commands

All verified working. Run from the repository root.

| Command                | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run dev`          | Dev server with Turbopack → http://localhost:3000                  |
| `npm run build`        | Production build. Must pass before any commit.                     |
| `npm start`            | Serve a production build locally                                   |
| `npm run lint`         | ESLint (Next 16 removed `next lint`; this calls `eslint` directly) |
| `npm run lint:fix`     | ESLint with autofix                                                |
| `npm run typecheck`    | `next typegen && tsc --noEmit` — see the note below                |
| `npm run format`       | Prettier write                                                     |
| `npm run format:check` | Prettier check (CI-safe)                                           |
| `npm test`             | Vitest unit suite, once. Needs no database and no network.         |
| `npm run test:watch`   | The same suite, in watch mode                                      |
| `npm run e2e`          | Playwright. **Needs `E2E_DATABASE_URL`** — see below.              |
| `npm run e2e:ui`       | The same suite in Playwright's UI mode, for writing tests          |
| `npm run e2e:report`   | Open the HTML report from the last run                             |

**Why `typecheck` runs `next typegen` first:** Next 16 generates global route types
(`LayoutProps<"/">`, `PageProps<"/path">`) into `.next/types/`, which is gitignored. On a
fresh clone, bare `tsc --noEmit` fails with `Cannot find name 'LayoutProps'` because those
types have never been emitted. `next typegen` produces them without a full build. Do not
"fix" that error by hand-writing the prop types — run typegen.

**Before any commit:** `npm run typecheck && npm run lint && npm test && npm run build`.

### Database

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm run db:generate`  | Regenerate the Prisma client into `src/generated/prisma`   |
| `npm run db:migrate`   | Create and apply a migration (development)                 |
| `npm run db:deploy`    | Apply pending migrations (production/CI)                   |
| `npm run db:seed`      | Seed from `src/content/*` — **overwrites matching rows**   |
| `npm run db:studio`    | Browse the database in a local GUI                         |
| `npm run db:reset`     | Drop, re-migrate, re-seed. **Destroys all data.**          |
| `npm run admin:create` | Create or update the single admin. Hidden password prompt. |

`npm run build` runs `prisma generate` first, so a fresh clone builds without a
database being reachable.

**`npm run db:seed` and `npm run db:reset` point at the DEVELOPMENT database, and only
because of Phase 11.** Before it there was one database and `.env.local` named the live
site — so seeding reverted production to whatever was in git, and resetting destroyed it.
Neither command changed; what they point at did. Check which branch `.env.local` names
before running either. `docs/decisions/0012`.

**`npm run vercel-build` is Vercel's build, not yours.** It applies pending migrations and
then calls `npm run build`. Vercel prefers a `vercel-build` script when one exists, which
keeps the migration step off the path a developer or CI takes. It applies migrations **only
when `VERCEL_ENV=production`** — preview deployments skip them, so an unreviewed migration
in a pull request cannot reach the production database even if a Vercel variable is
mis-scoped. Read `scripts/vercel-build.mjs` before changing any of that.

### End-to-end tests and the database they use

**`npm run e2e` will refuse to start until `E2E_DATABASE_URL` is set, and refuse again if
it resolves to the same database as `DATABASE_URL`.** That is not friction to work around
— it is the point.

The suite signs in and creates, publishes, and deletes real rows, because a
"create → publish → appears publicly" test that does not write is not testing anything.
Meanwhile local development and the Vercel project still share **one** Neon database
(Phase 11 gives production its own). `/projects` reads `searchParams`, so it is dynamic
rather than prerendered — a test project published against that database would appear on
the **live site**, and stay there if a run crashed before its cleanup.

So the suite reads `E2E_DATABASE_URL`, a name production does not set, and compares it
against `DATABASE_URL` with `-pooler` normalised away so Neon's pooled and direct strings
for one database are recognised as the same place. Use a Neon **branch** — a copy-on-write
clone, made in about ten seconds from the Neon console. Full reasoning and both refusal
messages: `tests/e2e/support/database.ts`.

The database is migrated and seeded by `tests/e2e/prepare-database.ts`, which runs as the
first step of `npm run e2e:server` — **before** `next build`, not from Playwright's
`globalSetup`. Playwright starts `webServer` _before_ `globalSetup`, so preparing the
database there would seed it after the build had already prerendered public pages from an
empty one. Do not move it.

`AUTH_URL` must be set for a production build, and the config does it. Without it every
`/api/auth/*` request from `next start` answers 500 with `UntrustedHost` — and `next dev`
is unaffected, so it looks like the tests broke rather than the configuration.

### Dependency overrides

`package.json` carries one `overrides` entry, forcing `deepmerge-ts` to `^8`. It exists
because Prisma 7.9.1 pins a version with a high-severity advisory and `npm audit fix --force`
"fixes" it by downgrading to Prisma 6. **Remove it when Prisma bumps its own pin** — check
with `npm view @prisma/config dependencies.deepmerge-ts`, and if it is 8 or higher, delete
the block and re-run `prisma validate`, `prisma generate` and `prisma migrate status`. Full
reasoning in `docs/decisions/0009`.

---

## Repository map

```
src/
  app/                  Next.js App Router. Routes, layouts, metadata.
    layout.tsx          Root layout: fonts, <html lang>, base metadata
    globals.css         Tailwind import + design tokens as CSS custom properties
  components/
    ui/                 Primitives: Button, Card, Badge, Eyebrow, Rule, SectionHeading.
                        No domain knowledge.
    layout/             Container, SiteHeader, SiteNav, SiteFooter, SkipLink
    portfolio/          Domain components (ProjectCard, ExperienceTimeline) — Phase 4
  lib/
    navigation.ts       Primary nav, single source for header and footer
    utils.ts            cn() — clsx + tailwind-merge
    storage.ts          ★ Storage façade. The ONLY module that imports
                        @vercel/blob. Validates uploads by magic bytes and
                        reads image dimensions from file headers.
    security-headers.ts ★ CSP and security headers, applied to every response
                        from next.config.ts. Imported by the Next config, so it
                        has no `server-only` guard and uses no `@/` alias.
                        Two directives deviate from the textbook policy on
                        purpose — read the comments before tightening either.
    email.ts            ★ Email façade. The ONLY module that imports resend.
                        Never throws — sending is a notification, not a
                        precondition for anything succeeding.
    validation/
      content.ts        Zod schemas for every content entity. Content modules
                        parse with these at import, so bad data fails the build.
                        Reused by prisma/seed.ts (Ph6) and Server Actions (Ph8).
  content/              Typed content modules. SEED SOURCE ONLY since Phase 6 —
                        read by prisma/seed.ts, never by the app at runtime.
  generated/prisma/     Prisma client. Build output, gitignored. Never edit.
  server/
    queries/            ★ Read façade. The ONLY place that touches Prisma.
                        Selects explicit fields so results are structurally the
                        domain types and internal columns never leak out.
                        Guarded with `import "server-only"`.
    actions/            Server Actions (writes). auth, projects, project-images,
                        resume, content (experience/education/skills/profile).
    revalidate.ts       Which paths each kind of edit invalidates. Shared, so
                        two action files writing the same content cannot drift.
    rate-limit.ts       Database-backed limits for the two endpoints a stranger
                        can reach: the contact form and sign-in. Counts rows,
                        not memory — an in-memory counter is per-instance on
                        serverless and therefore no limit at all. The login
                        limit is enforced in `authorize()`, NOT in the login
                        action; see docs/decisions/0010 before moving it.
  types/
    content.ts          Domain model. The shape the Prisma models will implement.
tests/
  unit/                 Vitest. Node environment — no jsdom, no React Testing
                        Library, because async Server Components cannot be
                        rendered by Vitest at all. See docs/decisions/0009.
  e2e/                  Playwright. Signs in and drives the real admin — the
                        only tests that render a page. Writes to a database,
                        and refuses to run against the live one; the guard is
                        in support/database.ts and is the first thing to read.
                        prepare-database.ts runs before the build, not from
                        globalSetup — see the note above.
docs/
  architecture.md       Full architecture and rationale
  roadmap.md            Phases, with live status
  decisions/            Numbered ADRs — append-only
```

Note: `globals.css` lives at `src/app/globals.css` (Next's convention), not `src/styles/`.

---

## Conventions

- **Server Components by default.** Add `"use client"` only when a component needs state,
  effects, or browser APIs — and push it as far down the tree as possible.
- **Never fetch data in a component.** Always go through `src/server/queries/`.
- **Every Server Action** starts with `await requireAdmin()` from `src/lib/auth-guard.ts`,
  then Zod-parses its input, then mutates, then revalidates. In that order, every time.
  A Server Action compiles to a public POST endpoint — the proxy never sees it.
- **Exactly three actions are unguarded, and a fourth is a bug:** `login` and `logout`
  (the auth endpoints), and `submitContactMessage` (the public contact form, whose
  boundary is a honeypot, a timing check, capped validation, and a database-backed rate
  limit — see `docs/decisions/0008`). The public write lives alone in
  `src/server/actions/contact.ts`; its admin counterparts are in `contact-admin.ts`, so
  the unguarded file stays short enough to read in full. Re-run the audit in
  `docs/roadmap.md` after touching any action.
- **`"use server"` files may only export async functions.** Shared types and constants
  (form state, initial values) live in `src/lib/validation/forms.ts`. Exporting a plain
  object from an actions file fails the build.
- **Admin reads that include drafts live in `src/server/queries/admin.ts`**, never in the
  public façade files. The filename is the guard against a public page importing one.
- **Every mutation must revalidate.** A write to the database is invisible until the
  affected paths are invalidated — including `/sitemap.xml`, and `/projects/[slug]` with
  `type: "page"` for dynamic segments.
- **Every admin form uses `FormShell`.** It focuses the first invalid field and states
  plainly that nothing was saved. This exists because a rejected save once looked
  identical to a successful one and cost a real edit — do not hand-roll a form without it.
- **Be liberal in what date input you accept.** `normalizeYearMonth` reads `2025`,
  `2025-6`, `6/2025`, and `June 2025`. Rejecting a reasonable format is a bug.
- **Every content model** carries `status: DRAFT | PUBLISHED`, `sortOrder`, and timestamps.
  Public queries filter to `PUBLISHED`. The single exception is `ProjectImage`, whose
  visibility is its project's — see `docs/decisions/0007` before adding a second one.
- **Never import `@vercel/blob` outside `src/lib/storage.ts`.** Actions call `uploadFile()`
  and `deleteFile()`. Same seam, same reason, as the query façade.
- **Uploads are validated by their bytes, not their names.** A declared MIME type and a
  file extension both come from the client. SVG is refused on purpose: it can carry
  script and is served from a URL the visitor's browser trusts.
- **Store the file before the row, and delete the row before the file.** An orphaned file
  costs a fraction of a cent; a row pointing at a file that does not exist is a broken
  image on a public page.
- **Alt text is required on every uploaded image** — a column, not an optional field.
- **Validate on the server regardless of client validation.** Client validation is UX.
- **A new public query goes in the sweep in `tests/unit/queries.test.ts`, and a new content
  collection goes in the import list at the top of `tests/unit/content.test.ts`.** Both files
  have a test that fails when you forget, so this is enforced rather than remembered — but
  the fix is to add the entry, never to loosen the enforcing test.
- **Never point the e2e suite at `DATABASE_URL`, and never weaken the guard that stops
  you.** It writes and publishes real rows, and that database is currently the live
  site's. `docs/decisions/0011` explains both refusals; the fix for hitting one is a
  throwaway database, never an exception.
- **A test must be seen to fail before it is trusted.** Break the thing on purpose, watch the
  right test go red, then revert. A green test that has never failed is evidence of nothing;
  two of the invariants in `tests/unit/` were confirmed exactly this way.
- **No `dangerouslySetInnerHTML`** except for vetted JSON-LD. Markdown must be sanitized.
- **Design tokens are CSS custom properties** in `globals.css`. Never write a hex value in a
  component — use `bg-page`, `text-ink`, `text-ink-muted`, `border-line`, `bg-accent`.
- **Never loosen the CSP to make something work.** Every token in
  `src/lib/security-headers.ts` is either needed by something in the built markup or
  deliberately absent, and the tests say which. If a new dependency needs an off-origin
  script or `connect-src` entry, that is a decision about the dependency, not a header edit.
- **Never add a color without measuring its contrast** against the theme it sits on. The
  palette is built for outdoor legibility; an unmeasured color silently breaks that. There
  are exactly two text colors (`ink`, `ink-muted`) and adding a third lighter one is how
  accessible palettes stop being accessible.
- **Section detailing comes from components,** not hand-placed markup: `SectionHeading`,
  `Eyebrow`, `Rule`, `Card`. That is what keeps the rhythm consistent across pages.
- **No animation library.** See `docs/decisions/0005`. CSS transitions only, and the global
  `prefers-reduced-motion` block stays.
- **Terminology (non-negotiable):** Taskrabbit is a _platform through which services are
  provided_, never an employer. Render as "via Taskrabbit". The data model enforces this
  with a `platform` field separate from `organization`.

---

## Environment variables

Documented in `.env.example`, which is committed and must stay current. Copy it to
`.env.local` (gitignored) for local work.

Read today: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and
`BLOB_READ_WRITE_TOKEN`. The last is the only optional one — without it the admin hides
its upload forms and says storage is not configured; nothing else changes.

---

## Do NOT modify

- **`node_modules/`**, **`.next/`** — generated.
- **`next-env.d.ts`** — generated by Next, and gitignored.
- **The `nextjs-agent-rules` block in `AGENTS.md`** — `next dev` rewrites it. Removing it
  from a diff only recreates an uncommitted change; commit it with your work.
- **`.gitattributes`** — without `eol=lf`, every file shows as fully modified between this
  Windows machine and Vercel's Linux builders.
- **`src/generated/`** — the Prisma client. Build output, gitignored, and
  regenerated by every build. A fix made there is erased on the next generate.
- **`prisma/migrations/*`** once applied — never edit an applied migration.
- **Auth configuration** without first reading `docs/decisions/0003-authjs-single-admin.md`.
- **Do not merge `auth.config.ts` into `auth.ts`.** The split exists because
  `src/proxy.ts` runs on the Edge runtime, where Prisma and the argon2 native
  module cannot load. Merging them works locally and fails on deploy.
- **Do not rename `src/proxy.ts` to `middleware.ts`.** Next 16 deprecated that
  convention; a `middleware.ts` would silently never run.
- **Never add a registration, invite, or first-user-becomes-admin path.**
  `scripts/create-admin.ts` is the only way an account is created, on purpose.
- **Do not move the login rate limit into the `login` Server Action.** It lives in
  `authorize()` because Auth.js accepts credentials at its own route
  (`POST /api/auth/callback/credentials`), so a check in the action is one an attacker
  skips. The action's copy exists only for the error message. `docs/decisions/0010`.

---

## Important: this is Next.js 16

Next 16 has breaking changes relative to most training data — `next lint` is gone, route
props are typed globally (`LayoutProps<"/">`, `PageProps<"/path">`), and the caching model
changed. **Do not write Next.js code from memory.** The installed version ships its own
docs at `node_modules/next/dist/docs/` — read the relevant guide first. `AGENTS.md` says
the same thing, and it is correct.

---

## Common workflows

**Add a public page** → create `src/app/<route>/page.tsx`, export `metadata` with a short
`title` (the root layout appends the site name) and an `alternates.canonical`, read data via
`src/server/queries/`, and add the route to `src/app/sitemap.ts`.

**Check headings before shipping a page** → the document must go h1 → h2 → h3 with no
skipped levels. `ProjectCard` and `CardTitle` take a heading level for exactly this reason.

**Add a new content type** → type in `src/types/` → Zod schema in `src/lib/validation/` →
content module in `src/content/` → query functions in `src/server/queries/` → components.
After Phase 6, also: Prisma model → migration → seed → admin module.

**Change the data shape** → update the type, the Zod schema, and the content module
together. After Phase 6, the Prisma schema is the source of truth and drives a migration.

**Deploy** → merge to `main`; Vercel builds automatically. PRs get preview deployments.

---

## Maintenance rule

**A phase is not complete until `CLAUDE.md` and `docs/roadmap.md` reflect it, in the same
commit as the change.** Documentation written later is documentation not written. When a
decision is made that a future reader would question, add an ADR to `docs/decisions/`.

---

## Working agreement

Inspect before changing. Read files before editing. Run typecheck, lint, and build after
meaningful work. Report failures rather than working around them. Stop at phase boundaries
for review. Flag complexity that is not earning its keep — see the over-engineering watch
list in `docs/architecture.md`.
