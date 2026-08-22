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
- **Current phase:** Phase 5 (SEO, a11y, performance). Phases 1–4 complete.
  See `docs/roadmap.md`.

Deployment is continuous, not a final step: `main` auto-deploys to the URL above, and pull
requests get their own preview deployments.

---

## Architecture at a glance

A **modular monolith** — one Next.js app, one deployment, one database. Not a separate
frontend and backend; Server Components read data, Server Actions write it.

```
Public routes (Server Components, cached)
      └── src/server/queries/*   ← READ FAÇADE. Pages call these, never a data source.
/admin (future)
      └── src/server/actions/*   ← WRITE LAYER. Auth check, then Zod parse, then mutate.
```

**The single most important convention in this repo:** pages and components never import
content or call the database directly. They call a function in `src/server/queries/`.
Today those functions return typed data from `src/content/`; in Phase 6 their bodies are
swapped to Prisma queries **and no component changes**. Do not bypass this seam — it is the
entire reason the public site can ship before the database exists.

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

**Why `typecheck` runs `next typegen` first:** Next 16 generates global route types
(`LayoutProps<"/">`, `PageProps<"/path">`) into `.next/types/`, which is gitignored. On a
fresh clone, bare `tsc --noEmit` fails with `Cannot find name 'LayoutProps'` because those
types have never been emitted. `next typegen` produces them without a full build. Do not
"fix" that error by hand-writing the prop types — run typegen.

**Before any commit:** `npm run typecheck && npm run lint && npm run build`.

_(future)_ `npm test` (Vitest), `npm run e2e` (Playwright), `npm run db:*` (Prisma).

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
    validation/
      content.ts        Zod schemas for every content entity. Content modules
                        parse with these at import, so bad data fails the build.
                        Reused by prisma/seed.ts (Ph6) and Server Actions (Ph8).
  content/              Typed content modules — the data source until Phase 6,
                        then the input to prisma/seed.ts. Never imported by a
                        component; only by src/server/queries.
  server/
    queries/            ★ Read façade. The ONLY place that knows where data comes
                        from. Every function is async and returns a Promise even
                        though the data is currently local — see decisions/0004.
                        Guarded with `import "server-only"`.
    actions/            Server Actions (writes). Empty until Phase 8.
  types/
    content.ts          Domain model. The shape the Prisma models will implement.
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
- **Every Server Action** _(from Phase 8)_ starts by verifying the session, then Zod-parses
  its input, then mutates. In that order, every time. A Server Action is a public HTTP
  endpoint with nicer syntax — middleware does not protect it.
- **Every content model** carries `status: DRAFT | PUBLISHED`, `sortOrder`, and timestamps.
  Public queries filter to `PUBLISHED`.
- **Validate on the server regardless of client validation.** Client validation is UX.
- **No `dangerouslySetInnerHTML`** except for vetted JSON-LD. Markdown must be sanitized.
- **Design tokens are CSS custom properties** in `globals.css`. Never write a hex value in a
  component — use `bg-page`, `text-ink`, `text-ink-muted`, `border-line`, `bg-accent`.
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
`.env.local` (gitignored) for local work. Only `NEXT_PUBLIC_SITE_URL` is read today.

---

## Do NOT modify

- **`node_modules/`**, **`.next/`** — generated.
- **`next-env.d.ts`** — generated by Next, and gitignored.
- **The `nextjs-agent-rules` block in `AGENTS.md`** — `next dev` rewrites it. Removing it
  from a diff only recreates an uncommitted change; commit it with your work.
- **`.gitattributes`** — without `eol=lf`, every file shows as fully modified between this
  Windows machine and Vercel's Linux builders.
- _(future)_ **`prisma/migrations/*`** once applied — never edit an applied migration.
- **Auth configuration** without first reading `docs/decisions/0003-authjs-single-admin.md`.

---

## Important: this is Next.js 16

Next 16 has breaking changes relative to most training data — `next lint` is gone, route
props are typed globally (`LayoutProps<"/">`, `PageProps<"/path">`), and the caching model
changed. **Do not write Next.js code from memory.** The installed version ships its own
docs at `node_modules/next/dist/docs/` — read the relevant guide first. `AGENTS.md` says
the same thing, and it is correct.

---

## Common workflows

**Add a public page** → create `src/app/<route>/page.tsx`, export `metadata`, read data via
`src/server/queries/`, add the route to the sitemap when one exists.

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
