import { z } from "zod";

/**
 * Minimum admin password length.
 *
 * 12 rather than the more common 8. There is exactly one account, its
 * password is set once from a local script and stored in a password manager,
 * so there is no usability argument for a short one — and the only realistic
 * attack on a single-user login is guessing.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Login form input.
 *
 * Deliberately does NOT enforce the length or complexity rules used when
 * creating an account. Validating a submitted password against the creation
 * policy tells an attacker which guesses were rejected for being malformed
 * versus merely wrong, and it would lock out any account whose password
 * predates a policy change. Length is checked where passwords are set.
 */
export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/** Used by scripts/create-admin.ts, where the policy does apply. */
export const newAdminSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  name: z.string().min(1).optional(),
});
