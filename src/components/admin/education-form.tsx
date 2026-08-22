"use client";

import { useActionState } from "react";

import { Field, Select, TextArea, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { emptyFormState } from "@/lib/validation/forms";
import { saveEducation } from "@/server/actions/content";
import type { Education } from "@/types/content";

export function EducationForm({ entry }: { entry?: Education }) {
  const [state, formAction] = useActionState(saveEducation, emptyFormState);
  const errors = state.fieldErrors;
  const isEdit = Boolean(entry);

  return (
    <FormShell
      state={state}
      action={formAction}
      submitLabel={isEdit ? "Save changes" : "Create entry"}
      cancelHref="/admin/education"
    >
      {isEdit ? <input type="hidden" name="originalSlug" defaultValue={entry?.slug} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Institution" htmlFor="institution" errors={errors.institution}>
          <TextInput
            id="institution"
            name="institution"
            defaultValue={entry?.institution}
            required
          />
        </Field>

        <Field label="Slug" htmlFor="slug" hint="Internal identifier." errors={errors.slug}>
          <TextInput id="slug" name="slug" defaultValue={entry?.slug} required />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Degree" htmlFor="degree" hint="e.g. B.S." errors={errors.degree}>
          <TextInput id="degree" name="degree" defaultValue={entry?.degree} required />
        </Field>

        <Field
          label="Field"
          htmlFor="field"
          hint="e.g. Computer Science, Minor in Entrepreneurship"
          errors={errors.field}
        >
          <TextInput id="field" name="field" defaultValue={entry?.field} required />
        </Field>
      </div>

      <Field label="Location" htmlFor="location" errors={errors.location}>
        <TextInput id="location" name="location" defaultValue={entry?.location ?? ""} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Start date" htmlFor="startDate" errors={errors.startDate}>
          <TextInput id="startDate" name="startDate" defaultValue={entry?.startDate} required />
        </Field>

        <Field label="End date" htmlFor="endDate" hint="Graduation month." errors={errors.endDate}>
          <TextInput id="endDate" name="endDate" defaultValue={entry?.endDate ?? ""} />
        </Field>

        <div className="flex items-center gap-2 sm:pt-7">
          <input
            id="expected"
            name="expected"
            type="checkbox"
            defaultChecked={entry?.expected}
            className="accent-accent size-4"
          />
          <label htmlFor="expected" className="text-ink text-sm">
            Expected (not yet graduated)
          </label>
        </div>
      </div>

      <Field
        label="Highlights"
        htmlFor="highlights"
        hint="One per line. Coursework, honours, GPA if you want it shown."
        errors={errors.highlights}
      >
        <TextArea
          id="highlights"
          name="highlights"
          defaultValue={entry?.highlights.join("\n")}
          rows={4}
        />
      </Field>

      <div className="border-line grid gap-5 border-t pt-6 sm:grid-cols-2">
        <Field label="Status" htmlFor="status" errors={errors.status}>
          <Select id="status" name="status" defaultValue={entry?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft — not public</option>
            <option value="PUBLISHED">Published — live</option>
          </Select>
        </Field>

        <Field label="Sort order" htmlFor="sortOrder" errors={errors.sortOrder}>
          <TextInput
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={entry?.sortOrder ?? 0}
          />
        </Field>
      </div>
    </FormShell>
  );
}
