"use client";

import { useActionState } from "react";

import { Field, FileInput, Select, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { uploadResumeVersion } from "@/server/actions/resume";
import { emptyFormState } from "@/lib/validation/forms";

/**
 * Upload a new resume revision.
 *
 * There is no "edit" counterpart on purpose: a revision is a file plus the
 * facts about that file, and changing the label of an old PDF is not
 * something worth a form. What is worth it — which revision is live — is the
 * publish toggle and the "make current" button on the list.
 */
export function ResumeUploadForm() {
  const [state, formAction] = useActionState(uploadResumeVersion, emptyFormState);
  const errors = state.fieldErrors;

  return (
    <FormShell
      state={state}
      action={formAction}
      submitLabel="Upload revision"
      resetOnSuccess
      successMessage="Revision uploaded."
    >
      <Field
        label="PDF file"
        htmlFor="file"
        hint="The file itself. Up to 4 MB."
        errors={errors.file}
      >
        <FileInput id="file" name="file" accept="application/pdf" required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Label"
          htmlFor="label"
          hint="How you will recognise this revision in the list."
          errors={errors.label}
        >
          <TextInput id="label" name="label" placeholder="Resume — August 2026" required />
        </Field>

        <Field
          label="Revised"
          htmlFor="revisedAt"
          hint="When the resume was written, not today. 2026-08 or August 2026."
          errors={errors.revisedAt}
        >
          <TextInput id="revisedAt" name="revisedAt" required />
        </Field>
      </div>

      <Field
        label="Download filename"
        htmlFor="downloadName"
        hint="What a visitor's browser saves it as. Letters, numbers, dots and hyphens; must end in .pdf."
        errors={errors.downloadName}
      >
        <TextInput
          id="downloadName"
          name="downloadName"
          defaultValue="Bidipta-Roy-Resume.pdf"
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status" htmlFor="status" errors={errors.status}>
          <Select id="status" name="status" defaultValue="DRAFT">
            <option value="DRAFT">Draft — check it first</option>
            <option value="PUBLISHED">Published — live immediately</option>
          </Select>
        </Field>

        <Field label="Current revision" htmlFor="isCurrent" errors={errors.isCurrent}>
          <label className="text-ink-muted flex min-h-11 items-center gap-2 text-sm">
            <input id="isCurrent" name="isCurrent" type="checkbox" defaultChecked />
            Offer this one for download
          </label>
        </Field>
      </div>
    </FormShell>
  );
}
