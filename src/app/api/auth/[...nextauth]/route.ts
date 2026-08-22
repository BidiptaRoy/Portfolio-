import { handlers } from "@/auth";

/**
 * Auth.js endpoints: sign-in, sign-out, session, CSRF.
 *
 * Node runtime, not Edge — `authorize` reaches Prisma and the argon2 native
 * module, neither of which loads on the Edge.
 */
export const { GET, POST } = handlers;
