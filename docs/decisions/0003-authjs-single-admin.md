# 0003 — Auth.js with a single credentials admin, not a hosted provider

- **Status:** Accepted
- **Date:** 2026-08-21

## Context

The admin CMS needs exactly one user: the site owner. There is no signup, no team, no
customer accounts, and no plausible future in which this site has many users. One of the
project's stated goals is learning how authentication actually works.

## Options considered

1. **Clerk (hosted).** Drop-in UI, MFA, account recovery. But nearly all of its value is
   value for _multi-user_ apps, and it introduces a third-party dependency on the single
   most security-sensitive route in the application.
2. **GitHub OAuth with an allowlist.** Arguably the most secure — no passwords stored at
   all. Rejected only because it skips the learning.
3. **Auth.js v5 with a Credentials provider.** Roughly 150 lines to own, no vendor, and it
   forces genuine understanding of sessions, JWTs, CSRF, and route protection.

## Decision

Auth.js v5, Credentials provider, exactly one admin.

- The admin row (email + argon2id hash) is created by `scripts/create-admin.ts`, run locally.
  **No HTTP registration route exists anywhere in the codebase** — the single most effective
  control available, and it is free.
- JWT session strategy (no session table needed for one user); httpOnly + Secure +
  SameSite=Lax cookie.
- Identical generic error for wrong-email and wrong-password, with constant-time comparison,
  so the login form cannot be used to enumerate users.

## Enforcement — three layers, because the first is not sufficient

1. `middleware.ts` redirects unauthenticated `/admin/*` requests to `/login`.
2. Every admin page and layout calls `await auth()` and redirects if absent.
3. **Every Server Action re-verifies the session as its first statement, before parsing
   input.**

Layer 3 is the actual security boundary; the other two are conveniences. Middleware is an
optimization — Next.js has shipped middleware-bypass CVEs, and a Server Action is a public
POST endpoint that can be invoked directly without ever routing through a page. Anyone
tempted to skip the check inside an action because "middleware already handles it" should
read this paragraph again.

## Consequences

- Password storage and session security are our responsibility.
- No password reset flow. Recovery means re-running the local admin script — acceptable for
  a single user with filesystem access.
- Out of scope by design: roles and permissions, OAuth providers, MFA, email verification.
  Each would be complexity serving a user base of one.
