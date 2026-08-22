# 0005 — "Editorial Oat": warm palette, measured contrast, no animation library

- **Status:** Accepted
- **Date:** 2026-08-21

## Context

The brief: a warm neutral beige and brown palette, "a coffee shop vibe", readable outdoors
in sunlight, simple to navigate, with consistent static detailing. Explicitly rejected: the
previous dark-themed site, which read as "too dark and childish", and a plain white site.

Two tensions had to be resolved rather than split the difference.

**1. "Beige" and "readable in the sun" pull against each other.** Sunlight legibility comes
from contrast, and beige-on-beige has almost none. Resolved by keeping warmth in the
_backgrounds_ while the ink stays near-espresso, and by measuring every pairing:

| Pair                        | Ratio                                |
| --------------------------- | ------------------------------------ |
| `ink` on `page`             | 13.6:1 (AAA)                         |
| `ink-muted` on `page`       | 5.6:1 (AA body)                      |
| `accent` on `page`          | 6.3:1 (AA body — safe for link text) |
| `ink` on `page`, dark theme | 14.6:1                               |

There is deliberately **no third, lighter text color.** A ~3.7:1 "subtle grey" is the usual
route by which an accessible palette quietly stops being accessible. The system has exactly
two text weights.

**2. "Coffee shop" can slide into looking like an actual cafe's website**, which would
undercut the engineering signal for the primary audience. Resolved by sourcing all warmth
from color temperature and typography — no textures, no photography, no hand-drawn
ornament — while the layout stays strict and editorial.

## Decision

**Palette.** Oat page (`#f5f0e8`), cream surface, espresso ink (`#2b2119`), roasted-brown
accent (`#7a4e2d`). Defined as CSS custom properties in `globals.css` and exposed to
Tailwind through `@theme inline`. Components use semantic utilities (`bg-page`, `text-ink`,
`border-line`) and never literal hex values.

**Type.** Fraunces (serif) for headings, Inter (sans) for body and UI. The serif is what
keeps the site from reading as a generic template and gives it a recognizable voice.

**Dark mode is secondary.** Light is the identity and the default. A warm-espresso dark
variant responds to `prefers-color-scheme` only — there is no toggle, so no client
component, no persistence, and no flash-before-hydration problem to solve. Because every
color is a token, the entire dark theme is one block of variable overrides.

**Static detailing, as components.** The consistency the brief asked for comes from the
detailing being reusable rather than hand-placed: `Eyebrow` (a small caps label with a short
leading rule, `── SELECTED WORK`), `SectionHeading` (eyebrow + serif title + lead +
hairline), `Rule` (hairline, optionally with a small diamond ornament), and `Card` with an
optional accent top edge. Every section on the site is built from these.

## No animation library

GSAP and similar were considered and **rejected**, despite being offered.

The stated requirement is that the site run well on any machine, not a high-end one. An
animation library works directly against that: it is a large parsed-and-executed JavaScript
payload on the main thread, and scroll-driven animation is one of the most common causes of
jank on low-end phones — exactly the device most likely to be used outdoors, which is the
scenario the palette was designed for. The brief also asked for _static_ detailing.

What the site uses instead, at zero JavaScript cost: CSS `transition-colors` on interactive
elements, `text-wrap: balance` on headings, and a global `prefers-reduced-motion` block.

This is not permanent. If a specific effect later earns its place, it can be added as a
scoped, lazily-loaded client component — but the default is no animation runtime.

## Consequences

- The only client component in the layout shell is `SiteNav`, which needs `usePathname` to
  mark the active section. Everything else is a Server Component.
- No mobile hamburger menu: five short labels fit one row and scroll horizontally on narrow
  screens. This avoids toggle state, focus trapping, and an escape-key handler for five
  links.
- Adding a color means measuring its contrast first. Adding one without checking is the
  single easiest way to break the thing this palette was designed around.
- `clsx` + `tailwind-merge` were added (`cn()` in `src/lib/utils.ts`). Without merge
  semantics, a caller passing `px-8` to a component that sets `px-4` gets a result decided
  by CSS source order rather than by intent.
