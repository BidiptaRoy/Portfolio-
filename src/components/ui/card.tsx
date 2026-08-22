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

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-ink font-serif text-lg", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-ink-muted text-sm leading-relaxed", className)} {...props} />;
}
