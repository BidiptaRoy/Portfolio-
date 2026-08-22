import { cn } from "@/lib/utils";

/**
 * Horizontal page frame. `narrow` holds a comfortable reading measure for
 * long-form text; `default` suits grids and multi-column content.
 */
export function Container({
  width = "default",
  className,
  ...props
}: React.ComponentProps<"div"> & { width?: "narrow" | "default" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        width === "narrow" ? "max-w-2xl" : "max-w-4xl",
        className,
      )}
      {...props}
    />
  );
}
