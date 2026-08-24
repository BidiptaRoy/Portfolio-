import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * RATE LIMITING for the two endpoints a stranger can reach.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Two of them exist, and they are the only two:
 *
 *   1. The contact form, which accepts writes from strangers by design.
 *   2. Sign-in, which accepts password guesses from strangers by necessity.
 *
 * Every other Server Action starts with `requireAdmin()`. These two cannot:
 * a contact form that requires you to be the site's owner is not a contact
 * form, and a login that requires you to be signed in is not a login. So
 * the boundary has to be built from something else, and this is it.
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
 * place to stop; a real edge rate limit would sit in front of this rather
 * than replace it.
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
async function hashClientIp(namespace: string): Promise<string | null> {
  const headerList = await headers();

  // Vercel sets both. x-forwarded-for may be a chain, and the client-supplied
  // end of it can be spoofed — the FIRST entry is the one the platform saw.
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerList.get("x-real-ip")?.trim();

  if (!ip) return null;

  /*
    `namespace` is what keeps the contact hash and the login hash of the same
    address from being equal. Without it, the two tables could be joined to
    show that whoever sent a message also tried to sign in — a correlation
    neither limit needs and nobody consented to.

    Do not change an existing namespace string: the hashes already stored in
    ContactMessage.ipHash were derived with "contact-rate-limit", and editing
    it silently resets every sender's allowance.
  */
  const salt = process.env.AUTH_SECRET ?? "";
  return createHash("sha256").update(`${namespace}:${ip}:${salt}`).digest("hex");
}

/**
 * Decide whether to accept another contact message right now.
 *
 * Returns the sender's hash on success so the caller can store it with the
 * message — that stored hash is what the next call counts.
 */
export async function checkContactRateLimit(): Promise<RateLimitVerdict> {
  return evaluateContactRateLimit(await hashClientIp("contact-rate-limit"));
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

/**
 * ═════════════════════════════════════════════════════════════════════════
 * SIGN-IN.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Phase 7 verified the login path carefully — CSRF, a shared error message
 * for both failure modes, a dummy argon2 hash so a nonexistent account takes
 * as long as a real one — and then recorded, correctly, that none of it stops
 * a script making thousands of guesses. This is that gap.
 *
 * ⚠ WHERE THIS IS ENFORCED MATTERS MORE THAN THE NUMBERS.
 *
 * The obvious place is the `login` Server Action, and the obvious place is
 * not enough. Auth.js mounts its own route handler, so
 * `POST /api/auth/callback/credentials` accepts credentials directly, with a
 * CSRF token anyone can fetch and without the Server Action being involved
 * at all. A limit that lives only in the action is a limit an attacker
 * simply walks around.
 *
 * So the boundary is inside `authorize()` in src/auth.ts, which every
 * credentials path goes through. The action checks too, but only so a
 * locked-out person gets a message that explains itself instead of "Invalid
 * email or password" — the same split as the auth layers in
 * docs/decisions/0003: the useful message in front, the real check behind.
 */

/**
 * Per address. Ten is deliberately generous — a real person with a password
 * manager and a stale entry can burn several attempts without doing anything
 * wrong — and still leaves brute force nowhere to go, because the window
 * resets rather than the allowance growing.
 */
const LOGIN_PER_IP_LIMIT = 10;
const LOGIN_WINDOW_MINUTES = 15;

/**
 * A ceiling across all addresses, for the distributed case the per-address
 * limit cannot see.
 *
 * Set high on purpose. Tripping it locks the site's owner out of their own
 * CMS for fifteen minutes, and unlike the contact form's global ceiling —
 * where the cost is dropped messages — the cost here is the one person who
 * needs in. A hundred failures in fifteen minutes is far past anything a
 * human does and still well inside "an attacker is wasting their time".
 */
const LOGIN_GLOBAL_LIMIT = 100;

export async function checkLoginRateLimit(): Promise<RateLimitVerdict> {
  return evaluateLoginRateLimit(await hashClientIp("login-rate-limit"));
}

/**
 * The decision, separated from reading the request — same reason as
 * `evaluateContactRateLimit`: `headers()` exists only inside a request, and
 * a limit that cannot be exercised outside one never gets tested.
 */
export async function evaluateLoginRateLimit(ipHash: string | null): Promise<RateLimitVerdict> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);

  const globalCount = await prisma.loginAttempt.count({ where: { createdAt: { gte: since } } });
  if (globalCount >= LOGIN_GLOBAL_LIMIT) {
    return { allowed: false, reason: "global" };
  }

  // No address means nothing to count against, so only the ceiling above
  // applies. Refusing instead would lock everyone out the moment a proxy
  // stopped forwarding the header — including the owner.
  if (!ipHash) return { allowed: true, ipHash: null };

  const recent = await prisma.loginAttempt.count({ where: { ipHash, createdAt: { gte: since } } });
  if (recent >= LOGIN_PER_IP_LIMIT) {
    return { allowed: false, reason: "per-ip" };
  }

  return { allowed: true, ipHash };
}

/**
 * Record a failed attempt, and prune the ones that have aged out.
 *
 * ⚠ CALL THIS ONLY FOR AN ATTEMPT THAT WAS ACTUALLY EVALUATED. Recording a
 * request that was already refused would let an attacker hold the window
 * open forever by continuing to hammer a locked-out address — the limit
 * would stop expiring, and a fifteen-minute pause would become a permanent
 * lockout that the attacker, not the clock, controls.
 *
 * The prune runs here because failed logins are the only thing that writes
 * to this table, so the cheapest place to clean it up is on the way in. No
 * cron, no scheduled function, nothing to forget to deploy.
 */
export async function recordFailedLogin(ipHash: string | null): Promise<void> {
  const cutoff = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);

  await prisma.loginAttempt.create({ data: { ipHash } });
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

/**
 * Forget an address's failures after it signs in successfully.
 *
 * Without this, four typos followed by a correct password would leave
 * someone six attempts from a lockout for the next quarter of an hour, for
 * having done nothing but eventually get it right.
 */
export async function clearLoginAttempts(ipHash: string | null): Promise<void> {
  if (!ipHash) return;
  await prisma.loginAttempt.deleteMany({ where: { ipHash } });
}

/**
 * Shown to someone the limit has stopped.
 *
 * States the wait, because "try again later" invites immediate retrying, and
 * says nothing about whether the email or the password was the problem — the
 * generic-failure rule from Phase 7 still holds here.
 */
export const LOGIN_RATE_LIMIT_MESSAGE =
  "Too many sign-in attempts. Please wait fifteen minutes and try again.";
