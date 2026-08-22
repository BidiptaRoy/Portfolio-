/**
 * The site's primary navigation, in display order.
 *
 * Single source of truth: the header and footer both read from here, so they
 * can never drift apart.
 *
 * `/services` is deliberately absent — see docs/architecture.md. The main nav
 * is optimized for recruiters; the services area is reached from About and the
 * footer so neither audience is shown content aimed at the other.
 */
export const navItems = [
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/resume", label: "Resume" },
  { href: "/contact", label: "Contact" },
] as const;

export type NavItem = (typeof navItems)[number];
