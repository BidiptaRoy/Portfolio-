# 0008 — The contact form: a public write, a database-backed rate limit, and email as a notification

**Status:** Accepted · Phase 9b

## Context

Every Server Action written before this one begins with `await requireAdmin()`. That single
line is the security boundary of the whole CMS (see 0003), and `docs/roadmap.md` carries an
audit script whose job is to catch an action that forgets it.

The contact form cannot have it. Accepting messages from strangers is the entire feature.
This is the first — and, for now, only — unauthenticated write in the codebase, so it needs
a boundary built out of something other than authentication.

## Decision

### The database is the system of record; email is a notification

The submitted message is written to `ContactMessage` first. The visitor's confirmation
depends on that write and nothing else. Only afterwards is an email attempted, and its
failure is recorded (`notifiedAt` stays null) rather than raised.

The alternative — send the email, and treat a send failure as a failed submission — is more
common and worse. It makes a stranger's message contingent on a third party's uptime, an
unexpired API key, and a domain's sending reputation. When any of those breaks, the sender
is told to try again while their message is discarded. A contact form that loses messages is
worse than no contact form, because the sender believes they were heard.

The consequence is that a broken email pipeline is invisible unless something surfaces it,
so two places do: the admin dashboard counts messages saved without a notification, and the
inbox badges each one "Not emailed". Otherwise a silent outage looks exactly like nobody
writing in.

### Rate limiting counts rows, not memory

The obvious implementation is a `Map` of IP → timestamps. It does not work on serverless.
Each invocation may run in a fresh instance with an empty map, so "5 per hour" silently
becomes "5 per hour per instance" — a limit that passes local testing and evaporates under
the concurrency a real flood produces. A control that looks correct while doing nothing is
worse than an absent one.

Redis is the standard answer and is on the over-engineering watch list in
`docs/architecture.md` for good reason: infrastructure to provision, pay for, and keep
available, in service of a portfolio's contact form. The messages table already exists and
already records exactly what was submitted. Counting rows in it is one indexed query,
correct across every instance, and adds nothing to the stack.

Two limits: five per sender per hour, and one hundred across all senders per hour. The
second exists because the first does nothing against rotating addresses.

**The honest limitation:** this caps _stored_ messages. A flood still costs one SELECT and
one INSERT per request, so it bounds database growth rather than preventing traffic. Real
edge rate limiting belongs in Phase 10 with security headers, and would sit in front of this
rather than replace it.

### IP addresses are hashed, never stored

`ipHash` is `sha256("contact-rate-limit:" + ip + AUTH_SECRET)`. The raw address is never
written. It answers the only question being asked — "is this the same sender as a minute
ago?" — and cannot answer "who is this?".

The salt matters: unsalted, an IP hash is reversible in seconds, because the entire IPv4
space is four billion values and a rainbow table over it is trivial. The `contact-rate-limit:`
prefix domain-separates the hash from anything else derived from `AUTH_SECRET`.

### Spam protection, weakest to strongest

1. **A honeypot field**, hidden from sight _and_ from assistive technology (`hidden`,
   `aria-hidden`, `tabIndex={-1}`). A screen-reader user being caught by an invisible trap
   would be an accessibility failure, not a security win.
2. **A minimum fill time** of three seconds. The timestamp is set by the browser and can be
   forged by anything that looks, so this stops naive bots and nothing else. It is written
   into the hidden field from an effect, not during render: the page is prerendered, so a
   render-time value would be the build timestamp — identical for every visitor for months.
3. **Zod parsing with a length cap on every field.** Elsewhere in this codebase an unbounded
   string is fine because the only person typing is the site's owner. Here it is a free way
   to write megabytes into the database.
4. **The rate limit above.** This is the one that actually holds.

Both traps answer with **success**. Telling a bot it was caught teaches whoever wrote it to
stop falling for the trap; a silent accept costs nothing and keeps it working. The only
visitor lied to is one that does not exist.

**No captcha.** Turnstile or reCAPTCHA would be stronger, and costs a third-party script on
a public page, another account, another key, and a small tax on every human who visits. That
is not a trade a portfolio's contact form has earned. If spam actually arrives, revisit it —
with evidence.

### Guarded and unguarded actions live in different files

`actions/contact.ts` holds the public write and nothing else. Marking messages read and
deleting them — both admin-only — live in `actions/contact-admin.ts`.

Mixing them would put guarded and unguarded exports in one file, where a new action inherits
whichever convention the neighbouring code happened to use. Separated, the dangerous file is
short enough to read in full, and an action in the wrong one looks wrong. Same reasoning as
`src/server/queries/admin.ts`.

**The audit in `docs/roadmap.md` must now expect three unguarded actions**, not two:
`login`, `logout`, and `submitContactMessage`.

## Consequences

- `RESEND_API_KEY` is optional. Without it the form works, stores everything, and says so in
  the admin. Nothing throws.
- Until a domain is verified with Resend, the only permitted sender is
  `onboarding@resend.dev`, and it delivers only to the address the Resend account was
  registered with. Workable with one recipient, but it is why a notification can silently
  fail to arrive while the API reports success. Domain verification is Phase 11.
- The notification is sent in `after()`, so the visitor does not wait on an API call whose
  outcome cannot change what they are told.
- Message bodies are stored and rendered as text, never as markup, and reach email as
  plain text. This is the only string on the site written by someone other than its owner.
