"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { checkLoginRateLimit, LOGIN_RATE_LIMIT_MESSAGE } from "@/server/rate-limit";

export type LoginState = { error: string | null };

/**
 * Sign in with email and password.
 *
 * Returns one generic message for every failure. Distinguishing "no such
 * account" from "wrong password" would turn this form into an oracle for
 * which email addresses have an account.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  /*
    NOT the rate limit boundary — that is inside `authorize()` in src/auth.ts,
    which is the only place every credentials path passes through. Auth.js
    accepts credentials at its own route too, so a check that lived only here
    would be one an attacker skips.

    This exists for the message. Without it a locked-out person is told
    "Invalid email or password", starts doubting a password that is perfectly
    correct, and keeps trying — which extends nothing but their own confusion.
  */
  const verdict = await checkLoginRateLimit();
  if (!verdict.allowed) {
    return { error: LOGIN_RATE_LIMIT_MESSAGE };
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });

    return { error: null };
  } catch (error) {
    // On success, signIn throws a NEXT_REDIRECT control-flow error. Catching
    // everything here would swallow it and leave the user sitting on the login
    // page with no feedback. Only AuthError is a real failure; everything else
    // must be rethrown.
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }

    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
