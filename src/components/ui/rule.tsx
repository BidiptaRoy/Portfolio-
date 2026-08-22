import { cn } from "@/lib/utils";

/**
 * A hairline divider. `ornament` adds a small centered diamond, used sparingly
 * between major sections — the one piece of decoration in the system.
 */
export function Rule({ className, ornament = false }: { className?: string; ornament?: boolean }) {
  if (!ornament) {
    return <hr className={cn("border-line border-0 border-t", className)} />;
  }

  return (
    <div className={cn("flex items-center gap-4", className)} role="separator">
      <span className="bg-line h-px flex-1" />
      <span aria-hidden className="bg-line-strong size-1.5 rotate-45" />
      <span className="bg-line h-px flex-1" />
    </div>
  );
}
