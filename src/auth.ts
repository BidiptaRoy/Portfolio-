import { verify } from "@node-rs/argon2";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { credentialsSchema } from "@/lib/validation/auth";
import { checkLoginRateLimit, clearLoginAttempts, recordFailedLogin } from "@/server/rate-limit";

/**
 * A real argon2id hash of a value nobody knows, used to burn roughly the same
 * CPU time when an email does not exist as when it does.
 *
 * Without it, a failed lookup returns in microseconds while a real account
 * spends ~100ms hashing — a timing difference large enough to enumerate valid
 * addresses from anywhere on the internet. Login already returns an identical
 * error message for both cases; this closes the side channel that would
 * otherwise make that message pointless.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$wx1ye3Ktr0k8Inlx7Yr4Jw$KqUStagA3efgUmwqE2DUFUwN9nvzv3H7Fg65oUY39Kc";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  session: {
    // JWT rather than a database session: one user, so a session table would
    // add a query to every request and buy nothing. The trade-off is that a
    // session cannot be revoked server-side before it expires — acceptable
    // here, and the reason the lifetime is short.
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /**
       * Returns a user object on success, or null on ANY failure.
       *
       * Every failure path returns the same null and takes comparable time.
       * Never return a different error for "no such user" versus "wrong
       * password" — that turns the login form into an account-existence
       * oracle.
       *
       * ⚠ THIS IS WHERE THE LOGIN RATE LIMIT IS ENFORCED, and it has to be
       * here rather than in the `login` Server Action. Auth.js mounts its
       * own handler, so `POST /api/auth/callback/credentials` reaches this
       * function directly, without the action. A limit in the action alone
       * is one an attacker walks around. See src/server/rate-limit.ts.
       */
      async authorize(raw) {
        /*
          Checked BEFORE the credentials are even parsed, let alone hashed.
          argon2 is deliberately expensive — that is the point of it — so a
          flood of guesses is also a CPU exhaustion attack, and the cheapest
          moment to refuse is before any of that work happens.
        */
        const verdict = await checkLoginRateLimit();

        if (!verdict.allowed) {
          /*
            Nothing is recorded on this path, on purpose. Counting a request
            that was already refused would let an attacker hold the window
            open indefinitely by continuing to hammer it, turning a
            fifteen-minute pause into a lockout they control rather than the
            clock. The person who sees the useful message here is the one
            the `login` action answers; this returns the same opaque null as
            every other failure.
          */
          return null;
        }

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          await recordFailedLogin(verdict.ipHash);
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.adminUser.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          // Burn equivalent time, then fail. The result is discarded.
          await verify(DUMMY_HASH, password).catch(() => false);
          await recordFailedLogin(verdict.ipHash);
          return null;
        }

        const valid = await verify(user.passwordHash, password).catch(() => false);
        if (!valid) {
          await recordFailedLogin(verdict.ipHash);
          return null;
        }

        // Succeeded, so this address's earlier failures are forgotten —
        // four typos then the right password must not leave someone one
        // attempt from a lockout.
        await clearLoginAttempts(verdict.ipHash);

        await prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },

    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
