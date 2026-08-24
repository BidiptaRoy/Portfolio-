/**
 * The account the e2e suite signs in as.
 *
 * Hard-coded on purpose, and safe to commit, because these credentials only
 * ever exist in the throwaway database `global-setup.ts` creates them in — a
 * database it refuses to run against unless it is demonstrably not the real
 * one. They are not a secret in the same sense the real admin password is;
 * treating them as one would mean an env var every contributor has to be told
 * about, for no gain.
 *
 * ⚠ Which also means: never point E2E_DATABASE_URL at a database that matters.
 * Doing so would create a known-password admin account in it.
 */
export const E2E_ADMIN_EMAIL = "e2e-admin@example.test";

/**
 * 12 characters minimum — `newAdminSchema` enforces the real policy and
 * `global-setup.ts` goes through it rather than around it, so a shorter
 * password here would fail setup rather than silently create a weak account.
 */
export const E2E_ADMIN_PASSWORD = "e2e-not-a-real-password";

/** A password that is valid input but wrong, for the failure-path tests. */
export const E2E_WRONG_PASSWORD = "definitely-not-the-password";
