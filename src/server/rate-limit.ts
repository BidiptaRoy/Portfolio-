import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * RATE LIMITING for the one public write endpoint in this codebase.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Every other Server Action starts with `requireAdmin()`. The contact form
 * cannot: its entire purpose is to accept writes from strangers. So the
 * boundary has to be built from something else, and this is it.
 *
 * **Why the database and not Redis or an in-memory counter.**
 *
 * An in-memory Map is the usual first answer and it does not work here. Each
 * serverless invocation may run in a fresh instance with its own empty Map,
 * so a limit of "5 per hour" becomes "5 per hour per instance" — which under
 * the concurrency an actual flood produces is no limit at all. It would look
 * correct in local testing and fail in production, which is the worst
 * property a security control can have.
 *
 * Redis solves it properly and is on the over-engineering watch list in
 * docs/architecture.md, for good reason: it is a whole piece of
 * infrastructure to run, pay for, and keep available, for a portfolio's
 * contact form. The messages table already exists and is already the record
 * of what was submitted. Counting rows in it is one indexed query, correct
 * across every instance, and needs nothing new. See docs/decisions/0008.
 *
 * The trade-off is honest: this limits *stored* messages, so a flood still
 * costs one INSERT and one SELECT each. That bounds the damage to database
 * writes rather than preventing the requests. For this site that is the right
 * place to stop; a real edge rate limit belongs in Phase 10 alongside
 * security headers, and would sit in front of this rather than replace it.
 */

/** Per sender. Generous for a person, tight for a script. */
const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MINUTES = 60;

/**
 * A ceiling across all senders, because the per-IP limit does nothing against
 * someone rotating addresses. If this trips, something abnormal is happening
 * and dropping legitimate messages for an hour is the lesser harm.
 */
const GLOBAL_LIMIT = 100;
const GLOBAL_WINDOW_MINUTES = 60;

export type RateLimitVerdict =
  { allowed: true; ipHash: string | null } | { allowed: false; reason: "per-ip" | "global" };

/**
 * The sender's IP, hashed. Null when no address is available.
 *
 * The raw IP is deliberately never stored. It is personal data under GDPR,
 * it is not needed for anything this site does, and a portfolio has no
 * business keeping a log of who visited it. A hash still answers the only
 * question being asked — "is this the same sender as a minute ago?" —
 * without being able to answer "who is this?".
 *
 * `AUTH_SECRET` provides the salt, prefixed so that this hash can never
 * collide with, or be confused for, anything else derived from that secret.
 * Without a salt, hashing an IP is reversible in seconds: the entire IPv4
 * space is four billion values and a rainbow table is trivial to build.
 */
async function hashSenderIp(): Promise<string | null> {
  const headerList = await headers();

  // Vercel sets both. x-forwarded-for may be a chain, and the client-supplied
  // end of it can be spoofed — the FIRST entry is the one the platform saw.
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerList.get("x-real-ip")?.trim();

  if (!ip) return null;

  const salt = process.env.AUTH_SECRET ?? "";
  return createHash("sha256").update(`contact-rate-limit:${ip}:${salt}`).digest("hex");
}

/**
 * Decide whether to accept another contact message right now.
 *
 * Returns the sender's hash on success so the caller can store it with the
 * message — that stored hash is what the next call counts.
 */
export async function checkContactRateLimit(): Promise<RateLimitVerdict> {
  return evaluateContactRateLimit(await hashSenderIp());
}

/**
 * The decision itself, separated from reading the request.
 *
 * Split out because `headers()` only exists inside a request, and a limit
 * that cannot be exercised outside one is a limit that never gets tested.
 * This half takes a hash and talks to the database, so it can be driven
 * directly — which is how the counts below were actually verified rather
 * than assumed. Phase 10's tests use the same entry point.
 */
export async function evaluateContactRateLimit(ipHash: string | null): Promise<RateLimitVerdict> {
  const globalSince = new Date(Date.now() - GLOBAL_WINDOW_MINUTES * 60_000);
  const globalCount = await prisma.contactMessage.count({
    where: { createdAt: { gte: globalSince } },
  });

  if (globalCount >= GLOBAL_LIMIT) {
    return { allowed: false, reason: "global" };
  }

  // With no address there is nothing to count against, so the global ceiling
  // above is the only limit that applies. Refusing instead would block every
  // sender the moment a proxy stopped forwarding the header.
  if (!ipHash) return { allowed: true, ipHash: null };

  const since = new Date(Date.now() - PER_IP_WINDOW_MINUTES * 60_000);
  const recent = await prisma.contactMessage.count({
    where: { ipHash, createdAt: { gte: since } },
  });

  if (recent >= PER_IP_LIMIT) {
    return { allowed: false, reason: "per-ip" };
  }

  return { allowed: true, ipHash };
}

/** Shown to a sender who has hit the limit. Deliberately not accusatory. */
export const RATE_LIMIT_MESSAGE =
  "That is a few messages in a short time. Please wait an hour, or email directly — the address is below.";
