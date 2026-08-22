import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary:
    "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-sunken",
  ghost: "text-ink hover:bg-surface-sunken",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
};

/**
 * Class string for button-shaped things. Exported separately so `next/link`
 * can look like a button without needing a polymorphic `asChild` abstraction
 * (and the Radix Slot dependency that comes with it).
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />;
}
