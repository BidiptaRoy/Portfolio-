import { cn } from "@/lib/utils";

/**
 * A small tag, used for technologies and categories. Squared rather than a
 * pill: the flat corners read as editorial metadata instead of generic chips.
 */
export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "border-line bg-surface inline-flex items-center rounded-sm border px-2 py-0.5 " +
          "text-ink-muted text-xs font-medium tracking-wide",
        className,
      )}
      {...props}
    />
  );
}
