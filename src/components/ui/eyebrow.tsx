import { cn } from "@/lib/utils";

/**
 * A small label that sits above a heading — the editorial device known as an
 * "eyebrow". The short leading rule is the signature detail of this design:
 *
 *     ──  SELECTED WORK
 *
 * It appears above every section heading on the site. Consistency is the whole
 * point; resist adding variants.
 */
export function Eyebrow({
  children,
  className,
  as: Component = "p",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  return (
    <Component
      className={cn(
        "text-ink-muted flex items-center gap-3 text-xs font-medium tracking-[0.18em] uppercase",
        className,
      )}
    >
      <span aria-hidden className="bg-line-strong h-px w-6 shrink-0" />
      {children}
    </Component>
  );
}
