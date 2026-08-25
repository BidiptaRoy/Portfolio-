# 0013 — The services area stays out of the main nav, with a stated trigger

**Status:** Accepted · Phase 12a

## Context

`docs/architecture.md` has said since Phase 1 that `/services` would not appear in the main
navigation:

> Recruiters and service clients want different things and each is mildly put off by content
> aimed at the other. The resolution: the nav is optimized for the primary audience, while
> `/services` is a first-class, indexed, directly linkable destination reachable from About
> and the footer.

When the services area was actually built, Bidipta asked for a Services tab in the nav, and
supplied the reason: he intends to grow this into a service-based business rather than keep
it as a side note.

That is worth taking seriously rather than pointing at the old decision, because **the
premise has changed**. The original reasoning rests on the portfolio being primary and the
services area being secondary. If services become the main event, the conclusion inverts.

## Decision

**Build the page exactly as originally designed — reachable from the footer and About, absent
from the header — and write down the condition that would change it.**

The deciding factor is what the site is currently being used for. The home page hero says:

> Open to software engineering internships and new-grad roles

While that sentence is on the page, a **Services** tab sits immediately above it in the
header. A recruiter's first impression becomes "handyman" before "software engineer" — not
because there is anything lesser about the work, but because a nav is read as a statement of
what a site is for, and two competing answers weaken both.

The cost of waiting is low, and asymmetric with the cost of being wrong:

- `/services` is **indexed and directly linkable**. A client searching for the work can find
  it, and Bidipta can send the URL directly. It is not hidden, only un-advertised to the
  wrong audience.
- Promoting it later is **one line** in `src/lib/navigation.ts`.
- Demoting it later, after recruiters have seen it, un-sends nothing.

### The trigger

Promote `/services` into the main navigation when **either** holds:

1. **The SWE job search is no longer the site's primary job** — the hero stops advertising
   availability for internships and new-grad roles.
2. **Services income matters more than the search** — the work is being actively grown as a
   business rather than fitted around free time.

This is written down so that promoting it is a decision someone makes, not a drift. Equally,
so that _not_ promoting it is not simply an old choice nobody revisited.

### It is enforced, not just documented

`tests/e2e/services.spec.ts` asserts that the header offers no Services link and that the
footer does. Adding it to `navItems` therefore fails a test — which is the point. The test
is not there because a nav link is fragile; it is there so that a change to this decision
announces itself instead of arriving in a diff nobody reads twice.

## Consequences

**The footer is the only in-site entry point besides About.** That makes the footer link
load-bearing in a way footer links usually are not, which is why it is covered by a test.

**Search is the primary discovery path for clients.** `/services` is in `sitemap.ts` with its
own metadata and canonical URL. Leaving it out of the sitemap on the grounds that it is "not
in the nav" would confuse two different decisions and make the page effectively private.

**When the trigger fires, three things change together**: the entry in `navItems`, the
assertion in `services.spec.ts`, and this file's status. Any one of them alone leaves the
repository contradicting itself.
