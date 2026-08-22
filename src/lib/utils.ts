import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, with later Tailwind utilities winning over earlier ones.
 *
 * Plain string concatenation is not enough here: if a component sets `px-4` and
 * a caller passes `px-8`, both land in the class list and the winner is decided
 * by CSS source order rather than by the caller's intent. `twMerge` resolves the
 * conflict in favor of the last value, which is what callers expect.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
