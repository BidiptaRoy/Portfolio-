import { execSync } from "node:child_process";

/**
 * The build Vercel runs. Applies pending migrations, then builds.
 *
 * Vercel prefers a `vercel-build` script over `build` when one exists, which
 * is the seam this uses: `npm run build` stays exactly what a developer and CI
 * run, and the migration step exists only on the deployment path. Putting
 * `migrate deploy` into `build` itself would make every local build and every
 * CI job apply migrations too — CI already does it explicitly, and a developer
 * running a production build to check something should not thereby migrate
 * anything.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠ WHY PRODUCTION IS CHECKED HERE RATHER THAN LEFT TO ENVIRONMENT SCOPING
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Vercel builds a preview deployment for every pull request, and preview
 * builds run this script too. Vercel environment variables can be scoped to
 * Production and Preview separately, so the intended arrangement is that
 * previews point at the development database and production points at the
 * production one — and if that scoping is right, this check is redundant.
 *
 * It is here because the scoping is dashboard configuration, and this project
 * has already lost three phases to dashboard configuration being wrong in a
 * way nothing surfaced. If Preview is ever left pointing at the production
 * database — the state it was in before Phase 11, and the default when someone
 * adds a variable without thinking about scope — then without this check,
 * opening a pull request would migrate production before anyone had reviewed
 * the migration. Schema changes would arrive ahead of the code that needs
 * them, on a database serving real traffic.
 *
 * A migration is the least reversible thing this application does. It gets the
 * check that does not depend on a setting in a web UI.
 *
 * This is plain .mjs rather than TypeScript, unlike everything else in
 * scripts/. It runs before the build on the deployment path, so putting a
 * transpiler in front of it would mean a missing devDependency could fail a
 * production deploy at the one step whose job is to make deploys safe.
 */

const run = (command) => execSync(command, { stdio: "inherit" });

const target = process.env.VERCEL_ENV ?? "unknown";

if (target === "production") {
  console.log("[vercel-build] production deployment — applying migrations");

  /*
    `migrate deploy` applies committed migrations and nothing else. It never
    generates one, never resets, and never prompts, which is what makes it the
    only migrate command safe to run unattended.

    It needs DIRECT_URL — the unpooled connection. Migrations hold a session
    open and a transaction pooler cannot support that. prisma.config.ts already
    prefers DIRECT_URL; the variable simply has to exist in the Vercel project.

    If this fails the build fails, and Vercel keeps serving the last successful
    deployment. That is the correct outcome: a half-migrated database serving
    traffic is worse than a deploy that did not land.
  */
  run("npm run db:deploy");
} else {
  console.log(`[vercel-build] ${target} deployment — skipping migrations`);
}

run("npm run build");
