import { cn } from "@/lib/utils";

/**
 * A raised surface. The `accent` variant adds a solid top edge in the accent
 * color — a static detail used to mark featured items without resorting to
 * shadows or gradients.
 */
export function Card({
  className,
  accent = false,
  ...props
}: React.ComponentProps<"div"> & { accent?: boolean }) {
  return (
    <div
      className={cn(
        "border-line bg-surface rounded-lg border p-6",
        accent && "border-t-accent border-t-2",
        className,
      )}
      {...props}
    />
  );
}

/**
 * `as` exists so a card can sit directly under the page's h1 without skipping
 * a heading level. Defaults to h3, which is correct when the card follows a
 * section h2; a grid placed straight under an h1 must pass "h2" instead.
 */
export function CardTitle({
  as: Tag = "h3",
  className,
  ...props
}: React.ComponentProps<"h3"> & { as?: "h2" | "h3" }) {
  return <Tag className={cn("text-ink font-serif text-lg", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-ink-muted text-sm leading-relaxed", className)} {...props} />;
}
