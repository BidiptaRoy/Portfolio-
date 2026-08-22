# 0004 — A read façade so the public site can ship before the database

- **Status:** Accepted
- **Date:** 2026-08-21

## Context

The end state is content stored in Postgres and edited through a CMS. But building the
database, authentication, and admin dashboard before any public page exists means nothing is
deployable for a long time, every UI phase is blocked on backend work, and motivation is
spent on plumbing nobody can see.

The obvious alternative — hardcode content into components now, rewrite later — means every
component gets rewritten when the database arrives.

## Decision

Introduce a **read façade** at `src/server/queries/`. It is the only code in the repository
that knows where content comes from.

Pages and components call `getProjects()`, `getPublishedExperience()`, and so on. They never
import `src/content/`, and they will never call Prisma.

| Phase | What the query functions do               | Components    |
| ----- | ----------------------------------------- | ------------- |
| 3–5   | Return typed data from `src/content/*.ts` | —             |
| 6+    | `prisma.project.findMany(...)`            | **unchanged** |

Content modules in `src/content/` are typed against the same types the Prisma models will
implement, so in Phase 6 they become the input to `prisma/seed.ts` rather than being thrown
away.

## Consequences

- A deployed, genuinely finished public portfolio exists at the end of Phase 5, before any
  database work — and none of it is throwaway.
- Query function signatures must be designed as if they were already hitting a database:
  they return promises, they filter to `PUBLISHED`, they accept the filtering and ordering
  arguments a real query would. A synchronous, convenience-shaped API would leak the
  file-based implementation into callers and defeat the purpose.
- **Bypassing the façade is the one change that would genuinely damage this architecture.**
  A component that imports `src/content/` directly, or later calls Prisma directly, breaks
  the substitution and must be corrected rather than accommodated.
- The same seam gives caching and revalidation a single natural home in Phase 6.
