"use client";

import { useActionState } from "react";

import { Field, TextArea, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { emptyFormState } from "@/lib/validation/forms";
import { saveProfile } from "@/server/actions/content";
import type { Profile } from "@/types/content";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction] = useActionState(saveProfile, emptyFormState);
  const errors = state.fieldErrors;

  return (
    <FormShell state={state} action={formAction} submitLabel="Save profile">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" errors={errors.name}>
          <TextInput id="name" name="name" defaultValue={profile?.name ?? ""} required />
        </Field>

        <Field
          label="Headline"
          htmlFor="headline"
          hint="e.g. Software engineer. Used in structured data for search engines."
          errors={errors.headline}
        >
          <TextInput
            id="headline"
            name="headline"
            defaultValue={profile?.headline ?? ""}
            required
          />
        </Field>
      </div>

      <Field
        label="Short bio"
        htmlFor="shortBio"
        hint="One or two sentences. Shown in the hero and used as the page description in search results."
        errors={errors.shortBio}
      >
        <TextArea
          id="shortBio"
          name="shortBio"
          defaultValue={profile?.shortBio ?? ""}
          required
          rows={3}
        />
      </Field>

      <Field
        label="Long bio"
        htmlFor="longBio"
        hint="Shown on About. Separate paragraphs with a blank line between them."
        errors={errors.longBio}
      >
        <TextArea
          id="longBio"
          name="longBio"
          defaultValue={profile?.longBio.join("\n\n") ?? ""}
          required
          rows={12}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Location" htmlFor="location" errors={errors.location}>
          <TextInput
            id="location"
            name="location"
            defaultValue={profile?.location ?? ""}
            required
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          hint="Shown publicly on Contact."
          errors={errors.email}
        >
          <TextInput
            id="email"
            name="email"
            type="email"
            defaultValue={profile?.email ?? ""}
            required
          />
        </Field>
      </div>

      <Field
        label="Availability"
        htmlFor="availability"
        hint="e.g. Open to software engineering internships and new-grad roles. Leave blank to hide it."
        errors={errors.availability}
      >
        <TextInput
          id="availability"
          name="availability"
          defaultValue={profile?.availability ?? ""}
        />
      </Field>
    </FormShell>
  );
}
