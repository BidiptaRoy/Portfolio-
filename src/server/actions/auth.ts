"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";

export type LoginState = { error: string | null };

/**
 * Sign in with email and password.
 *
 * Returns one generic message for every failure. Distinguishing "no such
 * account" from "wrong password" would turn this form into an oracle for
 * which email addresses have an account.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
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
