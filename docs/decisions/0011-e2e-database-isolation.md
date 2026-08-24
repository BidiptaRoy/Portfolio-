# 0011 — The e2e suite refuses to run against the application's database

**Status:** Accepted · Phase 10b

## Context

Phase 10b's e2e suite has to write. Its central test is `create → publish → appears
publicly` — the founding requirement of this project, that content is edited as data and
reaches the public site without a deploy. A version of that test which does not actually
create a project, publish it, and fetch it back from a public URL is not testing anything;
it is asserting that some functions exist.

Setting Playwright up surfaced the problem with that. **There is only one database.**
`.env.local` and the Vercel project both hold the same Neon connection string — Phase 11's
"production environment variables and database" is still unchecked, and until it is done,
the database a developer runs against and the database the live site serves from are the
same rows.

That was survivable while nothing wrote to it unattended. An e2e suite changes the stakes
in three specific ways:

1. It creates rows with fabricated content, on purpose, on every run.
2. It **publishes** one of them, on purpose, because that is the assertion.
3. `/projects` reads `searchParams` and is therefore dynamic rather than prerendered
   (Phase 4 accepted that trade deliberately). It reads the database on every request, so
   a published row is publicly visible **immediately**, with no deploy and no
   revalidation needed.

So the failure mode is: run the tests, the suite crashes between publishing and its
cleanup, and a project called "E2E Publish Check 1756…" is now on the live portfolio of
someone using that portfolio to look for work. Nothing alerts anyone. It stays until a
person happens to look.

The severity is not in how likely that is. It is in the combination of being silent,
public, and reputational, against a project whose entire purpose is to be seen by
recruiters.

## Decision

**The e2e suite never reads `DATABASE_URL`. It reads `E2E_DATABASE_URL`, and refuses to
start if that is missing or resolves to the same database.**

Two independent checks, because one of them can be defeated by a person trying to be
helpful:

### 1. A separate variable name

Nothing in `playwright.config.ts` or under `tests/e2e/` reads `DATABASE_URL`. Production
does not set `E2E_DATABASE_URL` and never will, and CI's e2e job deliberately leaves
`DATABASE_URL` unset entirely.

This means the dangerous configuration is not the default, and cannot be arrived at by
forgetting something. Forgetting yields a refusal with instructions, not a run.

### 2. A collision check

The first check does nothing against someone who pastes the real connection string into
`E2E_DATABASE_URL` to "just get it running" — which is exactly what a person does when a
tool refuses to start and a working connection string is sitting in the next file.

So `resolveTestDatabase()` also compares the two, and refuses if they match. The
comparison normalises: it drops credentials and query parameters, and strips `-pooler`
from the hostname. **That last part is the one that matters.** Neon issues two strings for
every database — pooled and direct — and a naive string comparison would call them
different databases and wave the production one straight through. This was verified by
pointing `E2E_DATABASE_URL` at the _direct_ string while `DATABASE_URL` held the _pooled_
one; the guard correctly reported them as the same database.

### The guard runs at config module scope

Not in `globalSetup`, which is where it was first written and which is too late.

**Playwright starts `webServer` before it runs `globalSetup`.** A check in `globalSetup`
runs after the server command has already begun — which for this project means after
`next build` has connected to a database and started prerendering public pages from it.
Discovered by running the suite with no `E2E_DATABASE_URL` set and watching a build start
anyway.

The same ordering fact moved database preparation: migrating and seeding now happen in
`tests/e2e/prepare-database.ts`, invoked as the first step of `npm run e2e:server`, ahead
of the build. From `globalSetup` they would have run _after_ the build had already
prerendered from an unseeded database.

## Consequences

**Running the e2e suite requires a second database.** A Neon branch is the intended
answer: copy-on-write, made in about ten seconds from the console, free on the current
plan, and resettable without consequence. The suite migrates and seeds it on every run, so
its state never has to be curated.

**This is friction, and the friction is the feature.** A guard that can be skipped when
inconvenient is decoration. The refusal messages therefore explain what to do rather than
only what went wrong.

**It does not fix the underlying condition.** One database shared between development and
production is still wrong, and it is still wrong for `npm run db:seed`, for
`npm run db:reset`, and for anyone editing rows in Prisma Studio — none of which this
guard covers. That is Phase 11's job. This decision bounds one new risk; it does not
retire the old one.

**When Phase 11 does split them, this guard stays.** A test database is not a development
database either, and by then the suite will be running unattended in CI on every pull
request.
