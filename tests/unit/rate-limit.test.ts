import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateContactRateLimit, RATE_LIMIT_MESSAGE } from "@/server/rate-limit";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * THE CONTROL THAT ACTUALLY HOLDS the one unauthenticated write endpoint.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * The honeypot and the fill-time check are speed bumps — both are supplied
 * by the browser and forgeable by anything that looks. This is the limit
 * with teeth, so it is the one that must not silently stop working.
 *
 * Driven through `evaluateContactRateLimit`, which exists precisely so the
 * decision can be exercised without a request: `headers()` only works
 * inside one, and a limit that cannot be tested is a limit that quietly
 * rots. Phase 9b drove it against a live database from a scratch script;
 * these run the same arithmetic against a counted mock, so they need
 * neither a server nor Postgres.
 *
 * The thresholds are duplicated here on purpose. They are not exported, and
 * a test that imports the number it is checking cannot notice the number
 * changing — which is the entire thing worth noticing about a limit.
 */

const PER_IP_LIMIT = 5;
const GLOBAL_LIMIT = 100;
const WINDOW_MINUTES = 60;

const { count } = vi.hoisted(() => ({ count: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { contactMessage: { count } } }));

// Imported by the module under test but only reached through
// `checkContactRateLimit`, which needs a real request.
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

type CountArgs = { where: { ipHash?: string; createdAt: { gte: Date } } };

/**
 * Queue the row counts this call will see, in the order the code asks for
 * them: the global ceiling first, then the per-sender window.
 *
 * `perIp` is queued only when given, so a test that expects the second
 * query never to happen cannot leave a value behind for the next one —
 * `mockReset` below covers that too, but a queue that mirrors the expected
 * call sequence exactly is what makes the call-count assertions mean
 * something.
 */
function counts({ global = 0, perIp }: { global?: number; perIp?: number }) {
  count.mockResolvedValueOnce(global);
  if (perIp !== undefined) count.mockResolvedValueOnce(perIp);
}

function argsOf(callIndex: number): CountArgs {
  return count.mock.calls[callIndex]?.[0] as CountArgs;
}

describe("evaluateContactRateLimit", () => {
  beforeEach(() => {
    // `mockReset`, not `clearAllMocks`: the latter clears recorded calls but
    // leaves queued `…Once` values in place, so an unconsumed count would
    // be handed to the following test as its first answer.
    count.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows a first-time sender and returns the hash to store", async () => {
    counts({ global: 3, perIp: 0 });

    // The caller writes this hash onto the message; that stored hash is
    // what the next call counts.
    await expect(evaluateContactRateLimit("abc123")).resolves.toEqual({
      allowed: true,
      ipHash: "abc123",
    });
  });

  it("allows a sender one message below the limit", async () => {
    counts({ global: 3, perIp: PER_IP_LIMIT - 1 });

    const verdict = await evaluateContactRateLimit("abc123");
    expect(verdict.allowed).toBe(true);
  });

  it("blocks a sender at the limit", async () => {
    counts({ global: 3, perIp: PER_IP_LIMIT });

    await expect(evaluateContactRateLimit("abc123")).resolves.toEqual({
      allowed: false,
      reason: "per-ip",
    });
  });

  it("counts only the sender's own messages against the per-sender limit", async () => {
    counts({ global: 3, perIp: 1 });
    await evaluateContactRateLimit("abc123");

    // The global count is unscoped; the second is keyed to this sender.
    expect(argsOf(0).where.ipHash).toBeUndefined();
    expect(argsOf(1).where.ipHash).toBe("abc123");
  });

  it("counts both windows from an hour ago", async () => {
    counts({ global: 3, perIp: 1 });
    await evaluateContactRateLimit("abc123");

    const anHourAgo = new Date(Date.now() - WINDOW_MINUTES * 60_000);
    expect(argsOf(0).where.createdAt.gte).toEqual(anHourAgo);
    expect(argsOf(1).where.createdAt.gte).toEqual(anHourAgo);
  });

  it("allows a sender again once their messages age out of the window", async () => {
    // Same sender, but every earlier message now falls outside the hour, so
    // the count comes back at zero. This is what makes the limit a window
    // rather than a permanent ban.
    counts({ global: 3, perIp: 0 });

    const verdict = await evaluateContactRateLimit("abc123");
    expect(verdict.allowed).toBe(true);
  });

  it("blocks everyone once the global ceiling is reached", async () => {
    /*
      The per-sender limit does nothing against someone rotating addresses.
      If this trips, something abnormal is happening, and dropping genuine
      messages for an hour is the lesser harm.
    */
    counts({ global: GLOBAL_LIMIT, perIp: 0 });

    await expect(evaluateContactRateLimit("abc123")).resolves.toEqual({
      allowed: false,
      reason: "global",
    });
  });

  it("checks the global ceiling before the sender, and stops there", async () => {
    counts({ global: GLOBAL_LIMIT });

    await evaluateContactRateLimit("abc123");
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("allows a sender with no resolvable address rather than punishing them", async () => {
    /*
      A visitor behind a proxy that stops forwarding the header has no hash,
      so there is nothing to count. Refusing instead would block every
      sender the moment that happened — the global ceiling above is the
      limit that still applies to them.
    */
    counts({ global: 3 });

    await expect(evaluateContactRateLimit(null)).resolves.toEqual({
      allowed: true,
      ipHash: null,
    });

    // No per-sender query is worth making without a key to count on.
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("still applies the global ceiling to a sender with no address", async () => {
    counts({ global: GLOBAL_LIMIT });

    await expect(evaluateContactRateLimit(null)).resolves.toEqual({
      allowed: false,
      reason: "global",
    });
  });
});

describe("RATE_LIMIT_MESSAGE", () => {
  it("points a blocked sender at the direct email instead", () => {
    // Someone hitting this is far more likely to be a person who resubmitted
    // than an attacker, so it must not read as an accusation and must leave
    // them a way through.
    expect(RATE_LIMIT_MESSAGE).toMatch(/email directly/i);
    expect(RATE_LIMIT_MESSAGE).not.toMatch(/blocked|spam|abuse|violation/i);
  });
});
