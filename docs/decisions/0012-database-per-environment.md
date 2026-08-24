# 0012 — A database per environment, and migrations on production deploys only

**Status:** Accepted · Phase 11

## Context

Until now this project had **one** database. `.env.local` and the Vercel project held the
same Neon connection string, so the rows a developer worked against and the rows the live
site served were the same rows.

Phase 10b made that impossible to ignore. Setting up Playwright meant introducing something
that writes unattended, and the e2e suite now refuses to run against the application's
database at all (`docs/decisions/0011`). But that decision was explicit that it only bounded
the new risk:

> It does not fix the underlying condition. One database shared between development and
> production is still wrong, and it is still wrong for `npm run db:seed`, for
> `npm run db:reset`, and for anyone editing rows in Prisma Studio — none of which this
> guard covers.

Those three are worth naming precisely, because none of them is exotic:

- **`npm run db:seed`** overwrites matching rows from `src/content/`. Since Phase 8 that
  content is stale by design — the CMS is the source of truth — so seeding is a documented
  way to _revert the live site_ to whatever is checked into git.
- **`npm run db:reset`** drops the database, re-migrates, and re-seeds. Against the shared
  database that destroys every real project edit, every uploaded image reference, and every
  contact message.
- **Prisma Studio** is a spreadsheet over production, and edits made there bypass
  revalidation entirely, so they do not even appear until the next deploy.

None of these had a guard. All three are one command or one click.

## Decision

### Three Neon branches, one per purpose

| Branch        | Used by                              | Set in                            |
| ------------- | ------------------------------------ | --------------------------------- |
| `production`  | the live site                        | Vercel, **Production** scope only |
| `development` | local `npm run dev`, seeding, Studio | `.env.local`                      |
| `e2e`         | `npm run e2e`                        | `.env.local`, `E2E_*` variables   |

Neon branches are copy-on-write, so this costs essentially no storage and no migration of
data: `development` is branched from `production` and starts as an exact copy.

The important consequence is behavioural rather than technical. **`db:seed` and `db:reset`
become safe.** They were always the right commands to have; they were pointed at the wrong
place.

### Migrations are applied by the deployment, not by a person

Once the databases differ, the production schema can drift behind the code. A deploy whose
code expects a column that production does not have fails at prerender — or worse, succeeds
and errors at runtime.

So `scripts/vercel-build.mjs` runs `prisma migrate deploy` before the build, wired in
through a `vercel-build` script, which Vercel prefers over `build` when it exists.

`npm run build` is deliberately left alone. It stays exactly what a developer and CI run,
and neither should migrate anything as a side effect of building.

### The migration step checks `VERCEL_ENV` rather than trusting environment scoping

This is the part worth reading, because it looks redundant.

Vercel builds a preview deployment for every pull request, and preview builds run
`vercel-build` too. Vercel variables can be scoped to Production and Preview separately, so
the intended arrangement — previews on `development`, production on `production` — already
prevents a preview from touching the production database. If that scoping is correct, the
check does nothing.

It is there because the scoping is **dashboard configuration**, and this project has
already lost three phases to dashboard configuration being wrong in a way nothing surfaced
(see the warning at the top of `CLAUDE.md`). "Production and Preview" is also the default
scope Vercel offers when a variable is added, which is exactly how the pre-Phase-11 state
came about in the first place.

Without the check, a single mis-scoped variable means **opening a pull request migrates
production** — applying a schema change nobody has reviewed, to a database serving real
traffic, ahead of the code that needs it.

A migration is the least reversible thing this application does. It gets the guard that
does not depend on a setting in a web UI.

## Consequences

**Local content and live content now diverge, and that is the point.** An edit made through
the live `/admin` does not appear locally, and vice versa. Anyone expecting the old
behaviour will read this as a bug; it is the fix. Re-branch `development` from `production`
in the Neon console to refresh it.

**A failed migration fails the deploy.** Vercel keeps serving the last successful build.
That is correct — a half-migrated database serving traffic is worse than a deploy that did
not land — but it does mean a bad migration blocks all deploys until it is fixed.

**Preview deployments need `development` to be migrated.** The normal workflow already does
this: `npm run db:migrate` creates and applies a migration against `development` before the
code is ever pushed.

**The e2e guard in `docs/decisions/0011` stays, and its second check gets weaker.** That
check compares `E2E_DATABASE_URL` against `DATABASE_URL`, and `DATABASE_URL` now names the
_development_ database rather than production. So it no longer protects production directly
— it protects the developer's own working data, which is still worth protecting, and the
separate-variable-name check is unaffected. The suite still cannot reach production, for the
simpler reason that production's connection string is no longer anywhere on the machine.

**Three connection strings now exist locally and it matters which is which.** `.env.example`
documents all of them, including which Neon branch each should come from.
