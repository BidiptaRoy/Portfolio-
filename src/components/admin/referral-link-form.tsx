"use client";

import { useActionState } from "react";

import { Field, Select, TextArea, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { emptyFormState } from "@/lib/validation/forms";
import { saveReferralLink } from "@/server/actions/services";
import type { ReferralLink } from "@/types/content";

export function ReferralLinkForm({ link }: { link?: ReferralLink }) {
  const [state, formAction] = useActionState(saveReferralLink, emptyFormState);
  const errors = state.fieldErrors;
  const isEdit = Boolean(link);

  return (
    <FormShell
      state={state}
      action={formAction}
      submitLabel={isEdit ? "Save changes" : "Create link"}
      cancelHref="/admin/services"
    >
      {isEdit ? <input type="hidden" name="originalSlug" defaultValue={link?.slug} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Label" htmlFor="label" hint="The button text." errors={errors.label}>
          <TextInput id="label" name="label" defaultValue={link?.label} required />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          hint="The public path: /r/your-slug. Changing it breaks links already shared."
          errors={errors.slug}
        >
          <TextInput id="slug" name="slug" defaultValue={link?.slug} required />
        </Field>
      </div>

      <Field
        label="Destination URL"
        htmlFor="url"
        hint="Where /r/[slug] sends people. Full URL, including https://."
        errors={errors.url}
      >
        <TextInput id="url" name="url" inputMode="url" defaultValue={link?.url} required />
      </Field>

      <Field
        label="Promo code"
        htmlFor="promoCode"
        hint="Shown next to the button. Leave empty if there is no code."
        errors={errors.promoCode}
      >
        <TextInput id="promoCode" name="promoCode" defaultValue={link?.promoCode ?? ""} />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        hint="One or two lines shown above the button — what the code applies to, for example."
        errors={errors.description}
      >
        <TextArea
          id="description"
          name="description"
          defaultValue={link?.description ?? ""}
          rows={3}
        />
      </Field>

      <div className="border-line grid gap-5 border-t pt-6 sm:grid-cols-2">
        <Field
          label="Status"
          htmlFor="status"
          hint="Unpublishing retires a code: /r/[slug] then sends people to /services instead."
          errors={errors.status}
        >
          <Select id="status" name="status" defaultValue={link?.status ?? "DRAFT"}>
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
            defaultValue={link?.sortOrder ?? 0}
          />
        </Field>
      </div>
    </FormShell>
  );
}
