"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { emptyFormState, HONEYPOT_FIELD } from "@/lib/validation/forms";
import { submitContactMessage } from "@/server/actions/contact";

/**
 * The public contact form.
 *
 * Does not use `FormShell`, which is the admin's. That component's language
 * is written for the person who owns the site ("Nothing was saved"), and its
 * job is protecting an edit in progress. A visitor needs something different:
 * confirmation that a stranger's message actually reached someone.
 *
 * Styled with the same primitives and tokens, so it still looks like the
 * rest of the site.
 */

const controlClass =
  "border-line bg-surface text-ink focus-visible:border-accent min-h-11 w-full rounded-md " +
  "border px-3 py-2 text-base outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? "Sending…" : "Send message"}
    </Button>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;

  return (
    <p id={`${id}-error`} role="alert" className="text-accent text-xs">
      {errors.join(" ")}
    </p>
  );
}

export function ContactForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(submitContactMessage, emptyFormState);
  const errors = state.fieldErrors;

  /*
    When this form became interactive in THIS browser.

    Written into the hidden field from an effect rather than during render.
    Three constraints have to hold at once:

      - The page is PRERENDERED, so a timestamp in the markup would be the
        build time — one value for every visitor, for months.
      - `Date.now()` during render is impure, and the compiler is right to
        reject it.
      - The action stays plain `formAction`, so a browser with JavaScript
        disabled still posts the form. Wrapping it to inject the value would
        make scripts a requirement for reaching a person, which spam
        protection has no business doing.

    So the field ships as "0" and the browser overwrites it on mount. No JS
    means it stays 0, which the server reads as unknown rather than as
    suspiciously fast.
  */
  const renderedAtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renderedAtRef.current) renderedAtRef.current.value = String(Date.now());
  }, []);

  if (state.success) {
    return (
      <div
        role="status"
        className="border-line bg-surface flex flex-col gap-2 rounded-lg border p-5"
      >
        <p className="text-ink font-serif text-lg">Message sent.</p>
        <p className="text-ink-muted text-sm leading-relaxed">
          Thanks — it has been received and I will reply to the address you gave. If you would
          rather follow up directly, I am at{" "}
          <a href={`mailto:${email}`} className="text-accent hover:text-accent-hover">
            {email}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p role="alert" className="border-accent text-accent rounded-md border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <input ref={renderedAtRef} type="hidden" name="renderedAt" defaultValue="0" />

      {/*
        The honeypot. `aria-hidden` and `tabIndex={-1}` keep it away from
        screen readers and from the tab order, so no keyboard or assistive
        user can reach it by accident — being caught by a spam trap you
        cannot see would be an accessibility failure, not a security win.
        `hidden` rather than off-screen positioning, which some bots detect.
      */}
      <div hidden aria-hidden="true">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-ink text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            maxLength={120}
            aria-invalid={errors.name?.length ? true : undefined}
            aria-describedby={errors.name?.length ? "name-error" : undefined}
            className={controlClass}
          />
          <FieldError id="name" errors={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-ink text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={200}
            aria-invalid={errors.email?.length ? true : undefined}
            aria-describedby={errors.email?.length ? "email-error" : undefined}
            className={controlClass}
          />
          <FieldError id="email" errors={errors.email} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="text-ink text-sm font-medium">
          Subject <span className="text-ink-muted font-normal">(optional)</span>
        </label>
        <input id="subject" name="subject" maxLength={160} className={controlClass} />
        <FieldError id="subject" errors={errors.subject} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-ink text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={5000}
          aria-invalid={errors.message?.length ? true : undefined}
          aria-describedby={errors.message?.length ? "message-error" : undefined}
          className={`${controlClass} min-h-32 leading-relaxed`}
        />
        <FieldError id="message" errors={errors.message} />
      </div>

      <SubmitButton />
    </form>
  );
}
