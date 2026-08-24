# 0009 — What the unit suite tests, and why one transitive dependency is overridden

**Status:** Accepted · Phase 10a

## Context

Phases 1–9 shipped a deployed site, a CMS, media uploads and a public contact form with no
automated tests at all. That was a deliberate ordering, not an oversight — but it left two
specific gaps, both recorded at the time rather than discovered later:

1. **Checks that ran once and then protected nothing.** The storage façade's magic-byte
   rejections and the contact form's rate-limit windows were both verified properly, against
   real bytes and a real database, from **scratch scripts that were never committed**. Every
   one of those results is in `docs/roadmap.md` as a passing table, and none of them would
   notice if the behaviour regressed tomorrow.

2. **Content that is validated only if a page happens to import it.** Content schemas run at
   module import, so a collection no rendered page reaches is never evaluated. This was
   proven, not assumed: a duplicate slug was planted in `education.ts` and the build passed
   green.

## Decision

### Vitest, node environment, no jsdom and no React Testing Library

The Next.js guide recommends `jsdom`, `@testing-library/react` and `@vitejs/plugin-react`.
None of them is installed. Everything worth unit-testing here is server-side — validation
transforms, byte inspection, rate-limit arithmetic, and the `where` clause each read façade
function sends — and none of it renders a component.

That is not only a dependency-count argument. Vitest cannot render an async Server
Component, and nearly every page in this app is one; the same guide says so and recommends
E2E tests instead. Installing a browser-shaped test environment would buy the ability to
test the few synchronous components while leaving the actual pages untestable. Rendering
coverage belongs to Playwright, in Phase 10b. Add jsdom with the first component test that
genuinely needs it, not before.

### `server-only` is aliased, not conditioned

Modules under `src/server/` and `src/lib/storage.ts` import `server-only`, which throws
anywhere outside a React Server Component. The package ships an empty build for exactly this
case, selected by the `react-server` export condition.

`vitest.config.mts` aliases the specifier straight to that empty build rather than turning
the `react-server` condition on globally, which would also change how `react` and `next`
resolve — a much larger blast radius for the same result.

### The tests assert invariants, not implementation

Two in particular are written to fail loudly rather than to describe current behaviour:

- **`tests/unit/content.test.ts` imports every collection unconditionally.** The import list
  at the top of that file _is_ the fix for gap 2 above, and a further test reads
  `src/content/` off disk and fails if a file there is missing from that list — otherwise the
  gap reopens the moment someone adds a collection.

- **`tests/unit/queries.test.ts` sweeps every public read** and asserts none of them can
  reach the database without `status: "PUBLISHED"`. A companion test enumerates the exports
  of the façade modules and fails if one is missing from the sweep. `admin.ts` is excluded on
  purpose: it is the one façade file whose reads include drafts.

Both were verified by deliberate mutation — dropping the filter from `getProjects` and adding
an SVG signature to the accepted image types each failed exactly one test, the right one. A
test that has never been seen to fail is not yet evidence of anything.

The rate-limit thresholds are **duplicated** in the test rather than imported. A test that
imports the number it checks cannot notice that number changing, which is the only thing
about a limit worth noticing.

### `deepmerge-ts` is overridden to ^8

`npm audit` reports three high-severity advisories, all the same one: `deepmerge-ts < 8.0.0`
is vulnerable to stack exhaustion on recursive object graphs. It arrives via
`prisma` → `@prisma/config` → `deepmerge-ts`, and Prisma 7.9.1 — the latest release — pins it
at exactly `7.1.5`, so there is no version of Prisma to upgrade to.

`npm audit fix --force` "fixes" it by installing `prisma@6.12.0`, undoing the Prisma 7
migration of Phase 6. That is not a fix.

The exposure here is close to nil: this is a build-time CLI dependency parsing
`prisma.config.ts`, a first-party committed file. No untrusted input reaches it, and it is
not in the runtime bundle — `@prisma/client` is a separate package. Documenting the risk and
accepting it would have been defensible.

It was overridden anyway, because a permanently red `npm audit` in CI teaches everyone to
ignore `npm audit`, and that habit costs more than this advisory ever will.

An override forces a version the upstream package did not sanction, so the CLI was exercised
rather than assumed: `prisma validate` (which loads `prisma.config.ts` through
`@prisma/config`, the code path that uses deepmerge), `prisma generate`, and
`prisma migrate status` against the live Neon database all succeed under `deepmerge-ts@8.0.2`.

**Remove this override when Prisma bumps its own pin.** Check with
`npm view @prisma/config dependencies.deepmerge-ts`; if it is 8 or higher, delete the
`overrides` block and re-run those three commands.

## Consequences

- `npm test` runs in well under a second and needs no database, no network, and no
  `BLOB_READ_WRITE_TOKEN`. It is cheap enough to run on every commit, which is the only
  property that gets a test suite actually run.
- The gap that remains is exactly the one named in Phase 9: **no admin screen has ever been
  rendered under test while signed in.** Every check to date drives actions and queries
  directly or reads a public page. That is Playwright's job in Phase 10b, and until it exists
  the admin UI is covered by nothing but manual use.
- An override in `package.json` is a thing a future reader must be able to date and justify.
  Hence this file.
