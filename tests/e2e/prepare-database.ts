import { execSync } from "node:child_process";

import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { newAdminSchema } from "../../src/lib/validation/auth";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./support/credentials";
import { identify, resolveTestDatabase } from "./support/database";

/**
 * Brings the e2e database up to date, then creates the admin the suite signs
 * in as.
 *
 * ⚠ This runs as the FIRST step of `npm run e2e:server`, before `next build` —
 * not from Playwright's `globalSetup`, which was the obvious place and is the
 * wrong one. Playwright starts `webServer` BEFORE it runs `globalSetup`, so
 * preparing the database there would seed it after the build had already
 * prerendered the public pages from an empty one. Home and the project detail
 * routes would then be built from no rows, and the tests would fail against
 * pages that were correct for the database as it stood when they were built.
 *
 * Being part of the server command also means it holds when Playwright reuses
 * a server you started yourself: `npm run e2e:server` prepares and serves as
 * one unit, so there is no way to have one without the other.
 */

async function main() {
  // Throws with instructions if this is unset or resolves to the live
  // database. playwright.config.ts has already made the same call at module
  // scope; this repeats it because the script is runnable on its own.
  const { url, directUrl } = resolveTestDatabase();

  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: directUrl };

  console.log(`\n[e2e] preparing test database: ${identify(url)}`);

  /*
    `migrate deploy`, not `migrate dev`: it applies the committed migrations and
    nothing else. `dev` would offer to generate a new migration from any schema
    drift, which in a non-interactive run is at best a hang.

    prisma.config.ts loads .env.local through dotenv, which never overwrites a
    variable that is already set — so the values above win.
  */
  execSync("npm run db:deploy", { env, stdio: "inherit" });
  execSync("npm run db:seed", { env, stdio: "inherit" });

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: directUrl }),
  });

  try {
    // Through the real schema rather than around it, so this cannot create an
    // account the application's own password policy would reject.
    const parsed = newAdminSchema.parse({
      email: E2E_ADMIN_EMAIL,
      password: E2E_ADMIN_PASSWORD,
      name: "E2E",
    });

    const passwordHash = await hash(parsed.password, { algorithm: 2 });

    await prisma.adminUser.upsert({
      where: { email: parsed.email },
      update: { passwordHash, name: parsed.name ?? null },
      create: { email: parsed.email, passwordHash, name: parsed.name ?? null },
    });

    /*
      Clear the login rate limit's ledger. The suite deliberately submits wrong
      passwords, and those are recorded — that is the Phase 10b feature working.
      Left to accumulate across runs they would eventually trip the
      ten-per-fifteen-minutes limit and fail the sign-in tests for a reason
      that has nothing to do with what is under test.
    */
    const cleared = await prisma.loginAttempt.deleteMany({});

    console.log(
      `[e2e] admin ready: ${parsed.email}` +
        (cleared.count > 0 ? ` (cleared ${cleared.count} login attempts)` : ""),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // The guard's message is the useful part and a stack trace buries it.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
