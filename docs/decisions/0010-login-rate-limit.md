# 0010 — Login rate limiting, and why it lives inside `authorize()`

**Status:** Accepted · Phase 10b

## Context

Phase 7 built the login path carefully and then wrote down what it did not have:

> **Still missing: rate limiting.** Nothing currently stops thousands of guesses.

Everything else on that path was verified — CSRF rejection, an identical error message for
"no such account" and "wrong password", and a dummy argon2id hash so the two take
comparable time (43 ms vs 37 ms, inside noise). All of that closes side channels around a
single guess. None of it limits how many guesses arrive.

The account it protects is the only one that exists, it is the only way into the CMS, and
`scripts/create-admin.ts` is the only way to create it — so there is no recovery flow to
fall back on if the password is guessed.

## Decision

### The limit is enforced in `authorize()`, not in the `login` Server Action

This is the decision that matters, and the obvious placement is the wrong one.

`src/server/actions/auth.ts` looks like the natural home: it is the function the login form
calls, and every other guard in this codebase sits at the top of a Server Action. But
Auth.js mounts its own route handler at `src/app/api/auth/[...nextauth]/route.ts`, which
means `POST /api/auth/callback/credentials` accepts email and password directly. The CSRF
token it requires is served, by design, to anyone who asks for it at `/api/auth/csrf`.

So a limit that lived only in the Server Action would be one an attacker skips by posting
to the endpoint next to it. `authorize()` is the single function every credentials path
must pass through, which makes it the only correct place for the check.

The action checks too, but only for the message: without it, someone who has been locked
out is told "Invalid email or password", starts doubting a password that is perfectly
correct, and keeps trying. Same shape as the three auth layers in 0003 — the useful
message in front, the real check behind.

This was tested rather than asserted. Fifteen wrong passwords were posted to
`/api/auth/callback/credentials`, bypassing the Server Action entirely: ten were recorded
and evaluated, and the remaining five were refused.

### The check runs before the password is hashed

argon2id is deliberately expensive — that is what makes it a good password hash — which
also makes a flood of guesses a CPU exhaustion attack on the function that serves them.
The rate-limit check is the first statement in `authorize()`, before the credentials are
even parsed, so a refused request costs two indexed counts and no hashing.

### A refused attempt is not recorded

The subtle one. The natural implementation records every attempt, and it produces a
permanent lockout: while an attacker keeps hammering a blocked address, rows keep being
written, the count never falls below the limit, and the window never expires. The attacker
would control the lockout rather than the clock — turning a rate limit into a
denial-of-service tool aimed at the site's owner.

So `recordFailedLogin` is called only for an attempt that was actually evaluated.

### A successful sign-in forgets that address's failures

Four typos followed by the correct password would otherwise leave someone six attempts
from a lockout for the next quarter of an hour, for having eventually got it right.

### Ten per address per fifteen minutes; a hundred globally

Ten is generous on purpose: a stale password-manager entry can burn several attempts
without anyone doing anything wrong. It still leaves brute force nowhere to go, because the
window resets rather than the allowance growing.

The global ceiling covers the distributed case a per-address limit cannot see, and it is
set high — a hundred failures in fifteen minutes — precisely because tripping it locks the
owner out. That is a different trade from the contact form's global ceiling, where the cost
of tripping is dropped messages rather than the one person who needs to get in.

### A new table, not a counter on `AdminUser`

The cheaper-looking option is `failedAttempts` and `lockedUntil` columns on the single
admin row. It was rejected: an account-level lock is a lockout an attacker can trigger
deliberately, from anywhere, with no way for the real owner to distinguish themselves. A
per-address count keeps the block on the address doing the guessing.

`LoginAttempt` stores a salted hash of the IP and a timestamp. There is deliberately **no
email column** — recording which addresses were tried would turn the table into a log of
guessed usernames, which is a thing worth stealing, and the limit does not need it.

The hash is namespaced (`login-rate-limit:` versus `contact-rate-limit:`) so the same
visitor's contact hash and login hash are different values. Without that, the two tables
could be joined to show that whoever sent a message also tried to sign in.

### Pruned by the code that writes it

Rows older than the window are deleted by `recordFailedLogin`. Failed logins are the only
thing that inserts here, so the cheapest place to clean up is on the way in — and it means
there is no cron job, no scheduled function, and nothing to forget to deploy. Same
reasoning as choosing the database over Redis in 0008.

## Consequences

- The remaining hole is the one the contact form has too: this limits attempts that reach
  the function, so a flood still costs requests. A true edge limit would sit in front of
  this rather than replace it.
- A blocked visitor sees the wait stated explicitly. "Try again later" invites immediate
  retrying.
- **Running a production build locally now needs `AUTH_URL`.** Not caused by this change,
  but discovered by it: `npm start` without `AUTH_URL` makes Auth.js refuse every request
  to `/api/auth/*` with `UntrustedHost`, because the host is only inferred automatically on
  Vercel. Noted in `.env.example`.
