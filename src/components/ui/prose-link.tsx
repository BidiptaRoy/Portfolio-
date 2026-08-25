/**
 * The style for a link that sits INSIDE a paragraph of text.
 *
 * ── Why the underline is not optional ──
 *
 * WCAG 1.4.1 (Use of Color) requires a link within a block of text to be
 * distinguishable by something other than colour alone. A coloured link in a
 * sentence is invisible to a reader who cannot distinguish that colour from
 * the surrounding text — and this palette's accent is a warm tan against warm
 * ink, which is one of the harder pairs to tell apart.
 *
 * This was a real, shipped failure, not a hypothetical: the first axe run
 * against this site (Phase 11) reported `link-in-text-block` at **serious**
 * impact on /about and /services, in BOTH colour schemes. Lighthouse had
 * scored Accessibility 100 on the same pages, because it runs only a subset of
 * axe's rules. `tests/e2e/accessibility.spec.ts` now catches it.
 *
 * ── When NOT to use this ──
 *
 * Only for links inside running text. A standalone link — a nav item, a card
 * link, a call to action on its own line — is already distinguishable by
 * position and does not need an underline; axe does not flag those, and
 * underlining them all would make the pages noisy for no benefit.
 */
export const proseLinkStyles =
  "text-accent hover:text-accent-hover underline underline-offset-2 transition-colors";
