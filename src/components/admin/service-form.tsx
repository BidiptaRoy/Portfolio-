"use client";

import { useActionState } from "react";

import { Field, Select, TextArea, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { emptyFormState } from "@/lib/validation/forms";
import { saveService } from "@/server/actions/services";
import type { Service } from "@/types/content";

export function ServiceForm({ service }: { service?: Service }) {
  const [state, formAction] = useActionState(saveService, emptyFormState);
  const errors = state.fieldErrors;
  const isEdit = Boolean(service);

  return (
    <FormShell
      state={state}
      action={formAction}
      submitLabel={isEdit ? "Save changes" : "Create service"}
      cancelHref="/admin/services"
    >
      {isEdit ? <input type="hidden" name="originalSlug" defaultValue={service?.slug} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" errors={errors.name}>
          <TextInput id="name" name="name" defaultValue={service?.name} required />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          hint="Internal identifier. Not a public URL — services have no detail pages."
          errors={errors.slug}
        >
          <TextInput id="slug" name="slug" defaultValue={service?.slug} required />
        </Field>
      </div>

      <Field
        label="Summary"
        htmlFor="summary"
        hint="One line. Say what the job is, plainly."
        errors={errors.summary}
      >
        <TextArea id="summary" name="summary" defaultValue={service?.summary} required rows={2} />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        hint="What a client actually needs to know before booking."
        errors={errors.description}
      >
        <TextArea
          id="description"
          name="description"
          defaultValue={service?.description}
          required
          rows={5}
        />
      </Field>

      <Field
        label="What it includes"
        htmlFor="includes"
        hint="One per line. Leave empty rather than padding — the list is hidden when blank."
        errors={errors.includes}
      >
        <TextArea
          id="includes"
          name="includes"
          defaultValue={service?.includes.join("\n")}
          rows={5}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Service area"
          htmlFor="serviceArea"
          hint="e.g. Boston, MA · Greater New York"
          errors={errors.serviceArea}
        >
          <TextInput
            id="serviceArea"
            name="serviceArea"
            defaultValue={service?.serviceArea ?? ""}
          />
        </Field>

        <Field
          label="Pricing note"
          htmlFor="pricingNote"
          hint="How pricing works — NOT a rate. A figure here is a promise to a stranger."
          errors={errors.pricingNote}
        >
          <TextInput
            id="pricingNote"
            name="pricingNote"
            defaultValue={service?.pricingNote ?? ""}
          />
        </Field>
      </div>

      <div className="border-line grid gap-5 border-t pt-6 sm:grid-cols-2">
        <Field label="Status" htmlFor="status" errors={errors.status}>
          <Select id="status" name="status" defaultValue={service?.status ?? "DRAFT"}>
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
            defaultValue={service?.sortOrder ?? 0}
          />
        </Field>
      </div>
    </FormShell>
  );
}
