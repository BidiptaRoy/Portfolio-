/**
 * Lets keyboard and screen-reader users jump past the navigation. Hidden until
 * focused. Must remain the first focusable element in the document.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="bg-accent text-on-accent sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}
