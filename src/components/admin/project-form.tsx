"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Field, Select, TextArea, TextInput } from "@/components/admin/form-fields";
import { Button, buttonStyles } from "@/components/ui/button";
import { emptyFormState } from "@/lib/validation/forms";
import { saveProject } from "@/server/actions/projects";
import type { Project } from "@/types/content";

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
    </Button>
  );
}

/**
 * Create and edit share one form. The only difference is the hidden
 * `originalSlug`, whose presence tells the action to update rather than
 * insert — and which lets the slug itself be edited without losing the row.
 */
export function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction] = useActionState(saveProject, emptyFormState);
  const isEdit = Boolean(project);
  const errors = state.fieldErrors;
  const formRef = useRef<HTMLFormElement>(null);

  const firstErrorField = Object.keys(errors)[0];
  const hasErrors = Boolean(state.error) || Boolean(firstErrorField);

  /**
   * Move the user to the first invalid field after a rejected save.
   *
   * Without this the only feedback is a banner at the top of a form that is
   * several screens tall. Submitting from the bottom looked exactly like a
   * successful save, and an edit was lost to it. A silent no-op is the worst
   * possible outcome for a form.
   */
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
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      {isEdit ? <input type="hidden" name="originalSlug" defaultValue={project?.slug} /> : null}

      {hasErrors ? (
        <p
          data-form-error
          role="alert"
          className="border-accent text-accent rounded-md border px-3 py-2 text-sm"
        >
          {state.error ?? "Nothing was saved — please correct the highlighted field."}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" errors={errors.title}>
          <TextInput id="title" name="title" defaultValue={project?.title} required />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          hint="The public URL: /projects/your-slug"
          errors={errors.slug}
        >
          <TextInput id="slug" name="slug" defaultValue={project?.slug} required />
        </Field>
      </div>

      <Field
        label="Summary"
        htmlFor="summary"
        hint="One sentence. Shown on cards and in search results."
        errors={errors.summary}
      >
        <TextArea id="summary" name="summary" defaultValue={project?.summary} required rows={2} />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        hint="The full account, shown on the detail page."
        errors={errors.description}
      >
        <TextArea
          id="description"
          name="description"
          defaultValue={project?.description}
          required
          rows={6}
        />
      </Field>

      <Field
        label="My role"
        htmlFor="role"
        hint="Optional. What you specifically did."
        errors={errors.role}
      >
        <TextInput id="role" name="role" defaultValue={project?.role ?? ""} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Started"
          htmlFor="startedAt"
          hint="2025, 2025-06, or June 2025. Leave blank if unknown."
          errors={errors.startedAt}
        >
          <TextInput id="startedAt" name="startedAt" defaultValue={project?.startedAt ?? ""} />
        </Field>

        <Field
          label="Completed"
          htmlFor="completedAt"
          hint="2025, 2025-06, or June 2025."
          errors={errors.completedAt}
        >
          <TextInput
            id="completedAt"
            name="completedAt"
            defaultValue={project?.completedAt ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Technologies"
        htmlFor="tech"
        hint="One per line. These drive the filter on /projects, so keep the spelling consistent."
        errors={errors.tech}
      >
        <TextArea id="tech" name="tech" defaultValue={project?.tech.join("\n")} rows={5} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Repository URL" htmlFor="repoUrl" errors={errors.repoUrl}>
          <TextInput
            id="repoUrl"
            name="repoUrl"
            inputMode="url"
            defaultValue={project?.repoUrl ?? ""}
          />
        </Field>

        <Field label="Live demo URL" htmlFor="liveUrl" errors={errors.liveUrl}>
          <TextInput
            id="liveUrl"
            name="liveUrl"
            inputMode="url"
            defaultValue={project?.liveUrl ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Outcomes"
        htmlFor="outcomes"
        hint="One per line. Leave empty rather than inventing something — the section is hidden when blank."
        errors={errors.outcomes}
      >
        <TextArea
          id="outcomes"
          name="outcomes"
          defaultValue={project?.outcomes.join("\n")}
          rows={4}
        />
      </Field>

      <Field
        label="Challenges"
        htmlFor="challenges"
        hint="One per line. Same rule — blank is better than filler."
        errors={errors.challenges}
      >
        <TextArea
          id="challenges"
          name="challenges"
          defaultValue={project?.challenges.join("\n")}
          rows={4}
        />
      </Field>

      <div className="border-line grid gap-5 border-t pt-6 sm:grid-cols-3">
        <Field label="Status" htmlFor="status" errors={errors.status}>
          <Select id="status" name="status" defaultValue={project?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft — not public</option>
            <option value="PUBLISHED">Published — live</option>
          </Select>
        </Field>

        <Field
          label="Sort order"
          htmlFor="sortOrder"
          hint="Lower appears first."
          errors={errors.sortOrder}
        >
          <TextInput
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={project?.sortOrder ?? 0}
          />
        </Field>

        <div className="flex items-center gap-2 sm:pt-7">
          <input
            id="featured"
            name="featured"
            type="checkbox"
            defaultChecked={project?.featured}
            className="accent-accent size-4"
          />
          <label htmlFor="featured" className="text-ink text-sm">
            Featured on the home page
          </label>
        </div>
      </div>

      {/* Repeated next to the button, because that is where the user is
          looking when they submit a form this tall. */}
      {hasErrors ? (
        <p role="status" className="text-accent text-sm">
          Not saved — {state.error ?? "please correct the highlighted field."}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton isEdit={isEdit} />
        <Link href="/admin/projects" className={buttonStyles({ variant: "secondary" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
