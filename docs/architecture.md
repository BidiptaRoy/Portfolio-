# Architecture

Reasoning behind the structure of this project. Conventions to follow are in `CLAUDE.md`;
individual decisions are recorded in `docs/decisions/`.

## The driving requirement

> Portfolio content should be **data, not hard-coded into the UI.**

The site's job is to absorb new internships, projects, and certifications for years without
anyone editing a React component. Everything below follows from that, plus two secondary
goals: the repository (not a chat log) must carry project knowledge, and two audiences —
recruiters and prospective service clients — must coexist without the site feeling like two
unrelated websites.

## Shape: modular monolith

One Next.js application, one deployment, one database, internally partitioned by domain.

```
Browser
   │
   ├── Public routes — Server Components, cached, statically rendered
   │        └── src/server/queries/*      READ FAÇADE
   │
   ├── /admin (Phase 7+) — RSC shell, client forms
   │        └── src/server/actions/*      WRITE LAYER (auth → Zod → mutate)
   │
   └── /r/[slug] (future) — outbound redirect, the referral seam
                  │
              Postgres (Neon) via Prisma
```

**Why not a separate Express API.** A split backend buys independent scaling and language
independence. This project needs neither — traffic is modest and there is exactly one
writer. What it costs is permanent: two deploys, two dependency trees, CORS, duplicated
types, an auth token dance, and roughly double the surface area a future reader must load
to make one change. Server Actions and Route Handlers already _are_ the backend: they run
on the server, hold secrets, and share types with the UI for free. If a genuine second
consumer ever appears, `src/server/` is already isolated enough to expose over HTTP then.

**Rendering.** Public pages are cached Server Components; a content edit triggers
revalidation. Visitors get near-static performance from fully dynamic content. Admin pages
are dynamic and never cached.

**Module boundaries.** Each content domain owns its Zod schema, queries, actions, and admin
form. Modules may depend on `lib/` and shared UI — never on each other's internals.

## The read façade — the load-bearing decision

`src/server/queries/` is the only code that knows where data comes from. Pages call
`getProjects()`; they never import `src/content/` and will never call Prisma.

| Phase | `getProjects()` returns                   | Components    |
| ----- | ----------------------------------------- | ------------- |
| 3–5   | typed data from `src/content/projects.ts` | unchanged     |
| 6+    | `prisma.project.findMany(...)`            | **unchanged** |

This is what lets a polished, deployed portfolio exist by Phase 5 without the database, and
without that work being throwaway. The same content modules then become the seed script.
Bypassing this seam is the one change that would genuinely damage the architecture.

See `docs/decisions/0004-content-facade-migration-path.md`.

## Seams cut early

Three things cost almost nothing now and are expensive to retrofit:

1. **`status` / `sortOrder` / timestamps on every content model.** The publish workflow's
   backbone. Adding it later touches every model and every query.
2. **A `(services)` route group and `Service` model.** The future client-facing area slots
   in without restructuring.
3. **`/r/[slug]` as an outbound redirect.** Every outbound Taskrabbit link points at an
   internal route from day one, so adding click tracking later is one insert statement in
   one file — no page edits, no link audit, no missed links.

## Representing two kinds of experience

The `Experience` model carries two discriminators rather than splitting into two tables
(which would render gig work as second-class) or one flat list (which would blur a software
internship with event staffing):

- `kind: TECHNICAL | PROFESSIONAL` — drives which section of the page it renders in
- `engagementType: INTERNSHIP | EMPLOYMENT | CONTRACT | PLATFORM_ENGAGEMENT | VOLUNTEER`
- `organization` (the actual client or employer) **separate from** `platform` (e.g.
  "Taskrabbit"), rendered as "via Taskrabbit"

The terminology requirement — Taskrabbit is a channel, not an employer — is enforced by the
schema rather than by remembering a convention.

## Information architecture

**Main navigation:** Home · About · Experience · Projects · Resume · Contact

Services is deliberately _not_ in the nav. Recruiters and service clients want different
things and each is mildly put off by content aimed at the other. The resolution: the nav is
optimized for the primary audience, while `/services` is a first-class, indexed, directly
linkable destination reachable from About and the footer — and carries its own layout via
its own route group, sharing design tokens so it reads as the same professional rather than
a bolted-on advertisement.

## Security posture

Introduced progressively; nothing is retrofitted at the end. The full table is in the
roadmap, but three principles hold throughout:

1. **No registration surface exists.** The admin is created by a local script. This is the
   single most effective control available, and it is free.
2. **Middleware is not a security boundary.** It is an optimization. Next.js has shipped
   middleware-bypass CVEs, and a Server Action can be invoked directly without routing
   through any page. Every action re-verifies the session as its first statement.
3. **Server-side validation is independent of client validation.** Client validation is UX.

## Known risks

- **Scope exceeds utility.** A CMS for ~30 records is not the efficient way to update a
  portfolio; editing a file would take ninety seconds. It is justified by learning goals and
  a multi-year horizon, not efficiency. The phase order preserves an off-ramp: stopping
  after Phase 5 leaves a complete, deployed portfolio.
- **Phase 2 stalling.** Visual identity is infinitely revisable. Timebox it, ship a
  constrained direction, refine against real content.
- **Prisma on serverless.** Each invocation can open a connection and exhaust the limit.
  Use Neon's _pooled_ string at runtime and the direct string for migrations, with a
  hot-reload-safe singleton.
- **Next.js caching.** "I updated content and the site shows the old version" is the most
  common Next frustration. Treat invalidation as first-class work in Phase 6.
- **Next 16 vs. training data.** APIs changed. Read `node_modules/next/dist/docs/`.

## Over-engineering watch list

Refuse unless a concrete problem demands it: a generic field-builder CMS abstraction (write
one explicit form per entity), Docker, tRPC or GraphQL on top of Server Actions, a monorepo,
Redis, background workers, microservices, an AI content assistant before the CMS works, and
building the services platform before the portfolio is live.

## Accepted trade-off: Vercel and Next coupling

Real. Server Actions, ISR, and `next/image` are best-in-class on Vercel and degrade
elsewhere. The escape hatch is that `src/server/` is plain TypeScript with no framework
dependency — a port would mean rewriting routing and rendering, not business logic.
