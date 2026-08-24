import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearLoginAttempts,
  evaluateLoginRateLimit,
  LOGIN_RATE_LIMIT_MESSAGE,
  recordFailedLogin,
} from "@/server/rate-limit";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * THE LOGIN RATE LIMIT — the gap Phase 7 opened and recorded.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Phase 7 got the careful parts right: CSRF, one shared error message for
 * both failure modes, and a dummy argon2 hash so a nonexistent account takes
 * as long as a real one. It also noted that none of that stops a script
 * making thousands of guesses.
 *
 * The thresholds below are duplicated rather than imported, for the same
 * reason as the contact limit: a test that imports the number it checks
 * cannot notice that number changing.
 */

const PER_IP_LIMIT = 10;
const GLOBAL_LIMIT = 100;
const WINDOW_MINUTES = 15;

const { count, create, deleteMany } = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { loginAttempt: { count, create, deleteMany } },
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

type CountArgs = { where: { ipHash?: string; createdAt: { gte: Date } } };

/** Global failures are counted first, then this address's. */
function failures({ global = 0, perIp }: { global?: number; perIp?: number }) {
  count.mockResolvedValueOnce(global);
  if (perIp !== undefined) count.mockResolvedValueOnce(perIp);
}

beforeEach(() => {
  // `mockReset`, not `clearAllMocks`: the latter leaves queued `…Once`
  // values for the next test to consume as its first answer.
  count.mockReset();
  create.mockReset();
  deleteMany.mockReset();
  create.mockResolvedValue({ id: "attempt" });
  deleteMany.mockResolvedValue({ count: 0 });

  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("evaluateLoginRateLimit", () => {
  it("allows an address with no recent failures", async () => {
    failures({ global: 0, perIp: 0 });

    await expect(evaluateLoginRateLimit("abc123")).resolves.toEqual({
      allowed: true,
      ipHash: "abc123",
    });
  });

  it("allows an address one attempt below the limit", async () => {
    // Ten is deliberately generous: a stale password-manager entry can burn
    // several attempts without anyone doing anything wrong.
    failures({ global: 0, perIp: PER_IP_LIMIT - 1 });

    expect((await evaluateLoginRateLimit("abc123")).allowed).toBe(true);
  });

  it("blocks an address at the limit", async () => {
    failures({ global: 0, perIp: PER_IP_LIMIT });

    await expect(evaluateLoginRateLimit("abc123")).resolves.toEqual({
      allowed: false,
      reason: "per-ip",
    });
  });

  it("counts a fifteen-minute window, not the contact form's hour", async () => {
    failures({ global: 0, perIp: 0 });
    await evaluateLoginRateLimit("abc123");

    const expected = new Date(Date.now() - WINDOW_MINUTES * 60_000);
    for (const call of count.mock.calls) {
      expect((call[0] as CountArgs).where.createdAt.gte).toEqual(expected);
    }
  });

  it("scopes the per-address count to that address", async () => {
    failures({ global: 0, perIp: 1 });
    await evaluateLoginRateLimit("abc123");

    expect((count.mock.calls[0]?.[0] as CountArgs).where.ipHash).toBeUndefined();
    expect((count.mock.calls[1]?.[0] as CountArgs).where.ipHash).toBe("abc123");
  });

  it("blocks everyone once the global ceiling is reached", async () => {
    // The distributed case the per-address limit cannot see.
    failures({ global: GLOBAL_LIMIT });

    await expect(evaluateLoginRateLimit("abc123")).resolves.toEqual({
      allowed: false,
      reason: "global",
    });
  });

  it("checks the ceiling first and stops there", async () => {
    failures({ global: GLOBAL_LIMIT });

    await evaluateLoginRateLimit("abc123");
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("allows an address that cannot be read, rather than locking out the owner", async () => {
    /*
      Refusing here would lock everyone out — the site's owner included —
      the moment a proxy stopped forwarding the header. The global ceiling
      still applies to them.
    */
    failures({ global: 0 });

    await expect(evaluateLoginRateLimit(null)).resolves.toEqual({
      allowed: true,
      ipHash: null,
    });
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("is more generous than the contact form's limit", () => {
    // Not arbitrary: a mistyped password is ordinary and a mistyped contact
    // form is not, so the two limits should not drift into each other.
    expect(PER_IP_LIMIT).toBeGreaterThan(5);
  });
});

describe("recordFailedLogin", () => {
  it("records the failure against the address", async () => {
    await recordFailedLogin("abc123");

    expect(create).toHaveBeenCalledWith({ data: { ipHash: "abc123" } });
  });

  it("records a failure with no address, so the ceiling still sees it", async () => {
    await recordFailedLogin(null);

    expect(create).toHaveBeenCalledWith({ data: { ipHash: null } });
  });

  it("prunes attempts that have aged out of the window", async () => {
    /*
      The table is cleaned up by the only code that writes to it. No cron,
      no scheduled function, nothing to forget to deploy.
    */
    await recordFailedLogin("abc123");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date(Date.now() - WINDOW_MINUTES * 60_000) } },
    });
  });

  it("prunes only what has expired, never the current window", async () => {
    // A prune with no cutoff, or one keyed on the wrong comparator, would
    // empty the table and silently disable the limit.
    await recordFailedLogin("abc123");

    const where = deleteMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(where.where).toHaveProperty("createdAt");
    expect(JSON.stringify(where.where)).toContain("lt");
  });
});

describe("clearLoginAttempts", () => {
  it("forgets an address's failures after a successful sign-in", async () => {
    /*
      Without this, four typos followed by the correct password leaves
      someone six attempts from a lockout for the next quarter hour, for
      having eventually got it right.
    */
    await clearLoginAttempts("abc123");

    expect(deleteMany).toHaveBeenCalledWith({ where: { ipHash: "abc123" } });
  });

  it("does nothing when there is no address to clear", async () => {
    // A `deleteMany` with `ipHash: null` would delete every attempt from
    // every unidentified client, wiping the global ceiling's evidence.
    await clearLoginAttempts(null);

    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe("LOGIN_RATE_LIMIT_MESSAGE", () => {
  it("states the wait", () => {
    // "Try again later" invites immediate retrying.
    expect(LOGIN_RATE_LIMIT_MESSAGE).toMatch(/fifteen minutes/i);
  });

  it("reveals nothing about which field was wrong", () => {
    // The generic-failure rule from Phase 7 still holds: this message must
    // not become an account-existence oracle by another route.
    expect(LOGIN_RATE_LIMIT_MESSAGE).not.toMatch(/password|email|account|user/i);
  });
});
