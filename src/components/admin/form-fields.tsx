import { cn } from "@/lib/utils";

/**
 * Shared form primitives for the admin.
 *
 * Deliberately plain: a label, a control, an optional hint, and errors. There
 * is no field-builder abstraction and no schema-driven form generator — the
 * architecture notes call that out as the most likely place this project
 * would over-engineer itself. Five explicit forms are easier to read and
 * change than one clever system that generates them.
 */

export const controlClass =
  "border-line bg-surface text-ink focus-visible:border-accent min-h-11 w-full rounded-md " +
  "border px-3 py-2 text-base outline-none";

export function Field({
  label,
  htmlFor,
  hint,
  errors,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-ink text-sm font-medium">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-ink-muted text-xs">
          {hint}
        </p>
      ) : null}

      {children}

      {/*
        aria-live so a validation failure is announced rather than appearing
        silently below a control the user has already tabbed past.
      */}
      {hasErrors ? (
        <p id={errorId} role="alert" className="text-accent text-xs">
          {errors?.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  errors,
  ...props
}: React.ComponentProps<"input"> & { errors?: string[] }) {
  return (
    <input
      {...props}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={errors?.length ? `${props.id}-error` : undefined}
      className={cn(controlClass, props.className)}
    />
  );
}

export function TextArea({
  errors,
  ...props
}: React.ComponentProps<"textarea"> & { errors?: string[] }) {
  return (
    <textarea
      {...props}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={errors?.length ? `${props.id}-error` : undefined}
      className={cn(controlClass, "min-h-24 leading-relaxed", props.className)}
    />
  );
}

export function Select({
  errors,
  ...props
}: React.ComponentProps<"select"> & { errors?: string[] }) {
  return (
    <select
      {...props}
      aria-invalid={errors?.length ? true : undefined}
      className={cn(controlClass, props.className)}
    />
  );
}
