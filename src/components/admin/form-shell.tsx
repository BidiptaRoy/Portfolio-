"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button, buttonStyles } from "@/components/ui/button";
import type { FormState } from "@/lib/validation/forms";

/**
 * The error handling and submit affordances every admin form needs.
 *
 * Extracted after a real bug: a rejected save showed its message at the top
 * of a tall form, off-screen from the submit button, so it looked like a
 * successful save and an edit was lost. Every form gets this behaviour by
 * construction now rather than by each one remembering to implement it.
 *
 * This is a shell, not a form generator — the fields themselves stay written
 * out explicitly in each form. See docs/architecture.md on over-engineering.
 */

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function FormShell({
  state,
  action,
  submitLabel,
  cancelHref,
  children,
}: {
  state: FormState;
  action: (formData: FormData) => void;
  submitLabel: string;
  cancelHref?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const firstErrorField = Object.keys(state.fieldErrors)[0];
  const hasErrors = Boolean(state.error) || Boolean(firstErrorField);

  useEffect(() => {
    if (!hasErrors) return;

    const target =
      (firstErrorField
        ? formRef.current?.querySelector<HTMLElement>(`[name="${firstErrorField}"]`)
        : null) ?? formRef.current?.querySelector<HTMLElement>("[data-form-error]");

    target?.scrollIntoView({ block: "center" });

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      target.focus();
    }
  }, [state, hasErrors, firstErrorField]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6">
      {hasErrors ? (
        <p
          data-form-error
          role="alert"
          className="border-accent text-accent rounded-md border px-3 py-2 text-sm"
        >
          {state.error ?? "Nothing was saved — please correct the highlighted field."}
        </p>
      ) : null}

      {state.success ? (
        <p role="status" className="border-line text-ink rounded-md border px-3 py-2 text-sm">
          Saved. The public site has been updated.
        </p>
      ) : null}

      {children}

      {hasErrors ? (
        <p role="status" className="text-accent text-sm">
          Not saved — {state.error ?? "please correct the highlighted field."}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton label={submitLabel} pendingLabel="Saving…" />
        {cancelHref ? (
          <Link href={cancelHref} className={buttonStyles({ variant: "secondary" })}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
