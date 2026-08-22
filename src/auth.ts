import { verify } from "@node-rs/argon2";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { credentialsSchema } from "@/lib/validation/auth";

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
       */
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.adminUser.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          // Burn equivalent time, then fail. The result is discarded.
          await verify(DUMMY_HASH, password).catch(() => false);
          return null;
        }

        const valid = await verify(user.passwordHash, password).catch(() => false);
        if (!valid) return null;

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
