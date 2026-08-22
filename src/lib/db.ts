import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * The single Prisma client for the application.
 *
 * Two things this guards against, both of which cause failures that look like
 * database outages rather than code bugs:
 *
 * 1. **Connection exhaustion in development.** Next's hot reload re-evaluates
 *    modules on every edit. Without caching on `globalThis`, each reload
 *    constructs another client with another pool, and after a few dozen saves
 *    Postgres refuses new connections. The cache is deliberately NOT applied
 *    in production, where each serverless instance should own exactly one.
 *
 * 2. **Using the wrong connection string.** DATABASE_URL must be Neon's
 *    POOLED URL. The direct URL belongs to `prisma migrate` only — pointing
 *    runtime traffic at it will exhaust the connection limit under any real
 *    load. See prisma.config.ts.
 */
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
