import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { auth } from "@/auth";
import { Container } from "@/components/layout/container";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata: Metadata = {
  title: "Sign in",
  // Keep the admin login out of search results. This is tidiness, not
  // security — the page is public by necessity and protects itself.
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <Container width="narrow" className="flex flex-col gap-8 py-20 sm:py-28">
      <div className="flex flex-col gap-3">
        <Eyebrow>Administration</Eyebrow>
        <h1 className="text-ink font-serif text-3xl">Sign in</h1>
        <p className="text-ink-muted text-sm">
          This area is restricted to the site owner. There is no public sign-up.
        </p>
      </div>

      <LoginForm />
    </Container>
  );
}
