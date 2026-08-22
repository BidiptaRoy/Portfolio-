# 0002 — Postgres (Neon) with Prisma, not MongoDB

- **Status:** Accepted
- **Date:** 2026-08-21

## Context

Portfolio content needs a persistent store that a CMS can write to and that will remain
comprehensible for years. The author already knows MongoDB well.

## Options considered

1. **MongoDB + Mongoose.** Near-zero ramp-up. But this content is unambiguously relational —
   projects have many tags, experiences reference skills, services will own referral links —
   and modeling that in Mongo means either duplication or manual `$lookup`s. No enforced
   relations, no migration history, and schema drift over a multi-year project is a real
   cost.
2. **Postgres + Prisma.** Versioned migrations put schema history in git, so a future reader
   can see how the model evolved. The generated client is fully typed: rename a field and
   the compiler lists every break.
3. **Postgres + Drizzle.** Lighter and closer to SQL with excellent inference, but rougher
   DX and a smaller body of examples.

## Decision

Postgres hosted on Neon, accessed through Prisma.

Neon over Supabase or Vercel Postgres: database branching (a throwaway DB per pull request),
a free tier suited to this scale, and no platform lock-in beyond a connection string.
Supabase bundles auth, storage, and realtime that this project does not need, and bundles
you do not use are still surface area to understand.

## Consequences

- Migrations are ceremony MongoDB does not impose, and schema changes are less spontaneous.
  That rigidity is the point on a project meant to last.
- `schema.prisma` becomes a single compact, complete, unambiguous description of the data —
  the highest-leverage context available to an AI agent working on this repo.
- **Serverless connection limits are a real hazard.** Prisma must use Neon's _pooled_
  connection string at runtime (`DATABASE_URL`) and the direct string for migrations
  (`DIRECT_URL`), with a hot-reload-safe singleton in `src/lib/db.ts`. Getting this wrong
  produces confusing production failures under load.
