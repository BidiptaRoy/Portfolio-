# 0006 — Prisma 7 setup, and two corrections to earlier decisions

- **Status:** Accepted
- **Date:** 2026-08-22
- **Extends:** [0002](0002-postgres-prisma.md)

## Context

`docs/decisions/0002` chose Postgres with Prisma. The version actually
installed is **Prisma 7.9.1**, which differs from almost every Prisma example
written for v6 — including the assumptions in ADR 0002 itself. This records
what v7 actually requires, and corrects two claims made earlier in planning
that turned out to be wrong.

## Prisma 7 specifics

- **Connection URLs live in `prisma.config.ts`, not in `schema.prisma`.** The
  `datasource` block now declares only the provider.
- **The client generates outside `node_modules`** — here to
  `src/generated/prisma`, which is gitignored. `prisma generate` therefore has
  to run before every build, so it is part of the `build` script rather than a
  `postinstall` hook, which Vercel can skip when it restores a cached
  `node_modules`.
- **Queries go through a driver adapter** (`@prisma/adapter-pg`).
- **Seeding is no longer run automatically by migrations.** `prisma db seed`
  must be invoked explicitly.

### The two connection strings

Neon exposes a pooled and a direct URL, and they are not interchangeable:

|                         | Used by                                 | Why                                                                                                          |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL` (pooled) | the app at runtime, via `src/lib/db.ts` | serverless invocations are many and short-lived; without the pooler they exhaust Postgres's connection limit |
| `DIRECT_URL` (direct)   | `prisma migrate`, `prisma db seed`      | these hold a session open, which a transaction pooler cannot support                                         |

The CLI and the runtime are configured in **separate files**, so each simply
takes the string it needs and they never share one. Prisma's own v7
documentation describes a `datasource.directUrl` config option to express
this — **it does not exist in the 7.9.1 type definitions.** The docs are out
of step with the release. The split above is cleaner anyway.

## Correction 1: no unused tables for future features

The architecture plan claimed `Service`, `ServiceCategory`, and `ReferralLink`
should exist in the schema from day one because "retrofitting relations costs
a migration and a query rewrite."

**That was overstated.** It is true for adding a relation onto rows that
already exist. It is not true for standalone tables, which is what these are —
they have no relationship to any content model. Adding a table later is a
single `prisma migrate dev`, which is routine.

Creating empty tables for features that may never be built is exactly the
over-engineering this project set out to avoid. They are not in the schema.
Phase 12 adds them when they are needed.

## Correction 2: `tech` stays a string array, not a `Tag` relation

`docs/content-model.md` originally described a shared `Tag` model normalizing
technologies across projects and skills.

Not implemented. `Project.tech` is a Postgres `String[]`. A join table would
buy referential integrity and protection against typos ("Node.js" versus
"NodeJS") — real benefits, but for seven projects and a single editor they do
not pay for the extra table, the join, and the mapping layer in every query.

**Revisit if** the project count grows enough that inconsistent naming becomes
visible in the filter UI, or if tags need their own metadata (a description, a
colour, a canonical URL). Migrating `String[]` to a relation later is a
mechanical data migration, not a redesign.

## Consequences

- The generated client is build output, and is excluded from git, ESLint, and
  Prettier. Never edit it; never commit a fix to it.
- `npm run build` runs `prisma generate` first, so a fresh clone and a Vercel
  build both work without a database being reachable.
- Anyone reading Prisma examples online must check whether they target v6 or
  v7; the two are materially different, and v6 examples are far more numerous.
