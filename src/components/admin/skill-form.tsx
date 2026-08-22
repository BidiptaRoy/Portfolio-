"use client";

import { useActionState } from "react";

import { Field, Select, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { emptyFormState } from "@/lib/validation/forms";
import { saveSkill } from "@/server/actions/content";
import type { AdminSkill } from "@/server/queries/admin";

export function SkillForm({ skill }: { skill?: AdminSkill }) {
  const [state, formAction] = useActionState(saveSkill, emptyFormState);
  const errors = state.fieldErrors;
  const isEdit = Boolean(skill);

  return (
    <FormShell
      state={state}
      action={formAction}
      submitLabel={isEdit ? "Save changes" : "Add skill"}
      cancelHref="/admin/skills"
    >
      {isEdit ? <input type="hidden" name="originalId" defaultValue={skill?.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Name"
          htmlFor="name"
          hint="Match the spelling used in project tech lists."
          errors={errors.name}
        >
          <TextInput id="name" name="name" defaultValue={skill?.name} required />
        </Field>

        <Field label="Category" htmlFor="category" errors={errors.category}>
          <Select id="category" name="category" defaultValue={skill?.category ?? "LANGUAGE"}>
            <option value="LANGUAGE">Languages</option>
            <option value="FRAMEWORK">Frameworks &amp; Libraries</option>
            <option value="DATABASE">Databases</option>
            <option value="TOOL">Tools</option>
            <option value="PRACTICE">Practices</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status" htmlFor="status" errors={errors.status}>
          <Select id="status" name="status" defaultValue={skill?.status ?? "PUBLISHED"}>
            <option value="DRAFT">Draft — not public</option>
            <option value="PUBLISHED">Published — live</option>
          </Select>
        </Field>

        <Field
          label="Sort order"
          htmlFor="sortOrder"
          hint="Lower appears first within its category."
          errors={errors.sortOrder}
        >
          <TextInput
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={skill?.sortOrder ?? 0}
          />
        </Field>
      </div>
    </FormShell>
  );
}
