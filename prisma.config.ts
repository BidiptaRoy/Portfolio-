import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads .env.local automatically; the Prisma CLI does not, and bare
// `dotenv/config` reads only `.env`. Without this the CLI sees no connection
// string and fails with an error that points at the database rather than at
// the missing file. Loading .env.local first gives it precedence, because
// dotenv never overwrites a variable that is already set.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

/**
 * Prisma CLI configuration (Prisma 7).
 *
 * Against a pooled Postgres such as Neon there are two connection strings,
 * and using the wrong one for the wrong job breaks things in ways that look
 * like database outages:
 *
 *   DATABASE_URL — the POOLED connection. Used at RUNTIME by the app, where
 *                  many short-lived serverless invocations would otherwise
 *                  exhaust Postgres's connection limit.
 *   DIRECT_URL   — the DIRECT, unpooled connection. Used by `prisma migrate`
 *                  and `prisma db seed`, which hold a session open and cannot
 *                  run through a transaction pooler.
 *
 * This file configures the CLI ONLY, so it takes DIRECT_URL. The runtime
 * client is configured separately in src/lib/db.ts with the pooled URL — the
 * two paths never share a connection string, which is why no `directUrl`
 * option is needed here.
 *
 * (Prisma's own v7 docs describe a `datasource.directUrl` option. It does not
 * exist in the 7.9.1 type definitions — the docs are out of step with the
 * release. The split above is cleaner regardless.)
 *
 * `process.env` is read directly rather than through Prisma's `env()` helper
 * so that `prisma generate` — which needs no database at all — still succeeds
 * when nothing is configured. That matters on a fresh clone and in CI, where
 * `npm run build` runs generate before any database exists.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
