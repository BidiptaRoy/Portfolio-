# 0015 — The e2e database guard skips the check it would otherwise run against itself

**Status:** Accepted
**Date:** 2026-08-25
**Supersedes nothing.** Extends `0011-e2e-database-isolation.md`, which introduced the guard.

## Context

`docs/decisions/0011` added a guard that refuses to run the Playwright suite unless
`E2E_DATABASE_URL` is set and names a different database from `DATABASE_URL`. The suite
signs in and creates, publishes and deletes real rows, so pointing it at the live database
would put test fixtures on the public site.

The guard has two halves:

1. **A separate variable name.** Nothing reads `DATABASE_URL` to decide where to write.
2. **A collision check.** Catches the other direction — someone pasting the real
   connection string into `E2E_DATABASE_URL` to "just get it running".

It landed in commit `9916332` together with the Playwright suite. **Every CI run from that
commit onwards failed** — seven in a row, always the `End-to-end` job, always with:

```
Error: Process from config.webServer was not able to start. Exit code: 1
```

The `Verify` job passed on all of them. The suite passed on the developer machine every
time, including with `CI=true`. The roadmap recorded the cause as unknown and treated the
absence of a `gh` CLI as the reason it could not be diagnosed.

## What was actually happening

The guard was refusing to run, and the thing it was refusing to run against was itself.

- `playwright.config.ts` calls `resolveTestDatabase()` at module scope. This is correct and
  deliberate — it is the earliest possible moment, before Playwright spawns anything.
- It then starts the server with `webServer.env.DATABASE_URL` set to **the database that
  call just returned**, because the application under test reads `DATABASE_URL`.
- `tests/e2e/prepare-database.ts` runs as the first step of that server command and calls
  `resolveTestDatabase()` **again**, because it is also runnable on its own.
- In that child, `DATABASE_URL` and `E2E_DATABASE_URL` are the same string **by
  construction**. The collision check fires and the process exits 1.

### Why it was invisible locally

```ts
const production = local["DATABASE_URL"] ?? process.env.DATABASE_URL;
```

`local` is `.env.local`, parsed off disk. On a developer machine that file exists and
supplies the **development** database, and it takes precedence — so the comparison was
e2e-against-development, which passes. CI has no `.env.local`, falls through to
`process.env.DATABASE_URL`, and gets the value Playwright injected a moment earlier.

The guard therefore behaved differently in the one environment nobody could watch it in.
That is the property worth remembering: **a guard whose inputs differ between CI and
local is a guard the e2e suite can never test.**

## Decision

`playwright.config.ts` sets `E2E_DATABASE_GUARD_PASSED=1` on the server it spawns.
`resolveTestDatabase()` skips **only the collision half** when it sees that marker.

The constant is exported from `tests/e2e/support/database.ts` and imported by the config,
so renaming it cannot silently disconnect the two halves.

### Why this is not a weakening

The check has already run — in the parent, at the only moment when the ambient
`DATABASE_URL` still named the real database. Skipping it in the child removes a
comparison that could only ever compare a value with itself.

Half 1 of the guard is untouched and still stands alone: nothing reads `DATABASE_URL` to
decide where to write, so the default and the forgetful path are both still safe.

A developer could set `E2E_DATABASE_GUARD_PASSED=1` in their own shell to bypass the
check. That is a deliberate act requiring knowledge of an undocumented-outside-this-ADR
variable, which is a different risk from an accident, and it is the same trade every
escape hatch makes.

## Alternatives rejected

- **Compare only against `.env.local`.** One-token fix, but it silently drops the check
  for anyone who exports `DATABASE_URL` in their shell instead of using the file.
- **Stop re-running the guard in `prepare-database.ts`.** The script is genuinely runnable
  on its own, and in that case the check is meaningful. Removing it trades a real
  protection for a smaller diff.
- **Don't set `DATABASE_URL` for the spawned server.** Not possible; the application reads
  it.

## Consequences

- `tests/unit/e2e-database-guard.test.ts` runs the guard from an **empty working
  directory**, which is what "no `.env.local`" means to it, and is therefore the CI shape.
  The CI-specific path is now covered by the unit suite, which runs on every commit,
  rather than only by the job it broke.
- Verified by mutation per the standing rule: with the fix reverted, exactly one test goes
  red — `proceeds when the parent has already run the check` — and nothing else.
- Verified end to end by hiding `.env.local` and running `CI=true npm run e2e` with only
  the `E2E_*` variables set, which is the runner's exact environment. **23 passed.**

## A second finding, recorded because it cost a day

**The GitHub Actions API answers unauthenticated for a public repository.** The roadmap
said the log "has never been read" and named the missing `gh` CLI as the blocker. It was
not one:

| Endpoint                                     | Gives                        |
| -------------------------------------------- | ---------------------------- |
| `/repos/{o}/{r}/actions/runs`                | every run and its conclusion |
| `/repos/{o}/{r}/actions/runs/{id}/jobs`      | which **step** failed        |
| `/repos/{o}/{r}/check-runs/{id}/annotations` | the error text itself        |

Only raw log downloads and artifacts need a token (both 403 without one). The annotation
endpoint alone gave the exact error string above, which was enough to locate the bug
without ever reading a log.
