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

- **Live URL:** _not yet deployed — set in Phase 1, Task 9_
- **Current phase:** Phase 1 (Foundation). See `docs/roadmap.md`.

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
    ui/                 Generic primitives (Button, Card, Badge). No domain knowledge.
    layout/             Header, Footer, Container, SkipLink
    portfolio/          Domain components (ProjectCard, ExperienceTimeline)
  content/              Typed content modules — the data source until Phase 6,
                        then the input to prisma/seed.ts
  server/
    queries/            ★ Read façade. The ONLY place that knows where data comes from.
    actions/            Server Actions (writes). Empty until Phase 8.
  lib/
    validation/         Zod schemas, one per entity. Shared by forms, actions, seed.
  types/                Shared domain types
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
- **Design tokens are CSS custom properties** in `globals.css`. Do not hardcode hex colors
  in components — that is what makes a site look like a template.
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
