import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * The standard section opener: eyebrow, serif title, optional lead paragraph,
 * closed by a hairline. Every major section on the site uses this, which is
 * what makes the page rhythm feel deliberate rather than assembled.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  level = 2,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  level?: 1 | 2;
  className?: string;
}) {
  const Title = level === 1 ? "h1" : "h2";

  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}

      <Title
        className={cn(
          "text-ink font-serif",
          level === 1
            ? "text-4xl leading-[1.1] sm:text-5xl"
            : "text-2xl leading-[1.15] sm:text-3xl",
        )}
      >
        {title}
      </Title>

      {lead ? <p className="text-ink-muted max-w-prose text-base sm:text-lg">{lead}</p> : null}

      <span aria-hidden className="bg-line mt-2 h-px w-full" />
    </header>
  );
}
