"use client";

import { useActionState } from "react";

import { Field, Select, TextArea, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { emptyFormState } from "@/lib/validation/forms";
import { saveExperience } from "@/server/actions/content";
import type { Experience } from "@/types/content";

export function ExperienceForm({ entry }: { entry?: Experience }) {
  const [state, formAction] = useActionState(saveExperience, emptyFormState);
  const errors = state.fieldErrors;
  const isEdit = Boolean(entry);

  return (
    <FormShell
      state={state}
      action={formAction}
      submitLabel={isEdit ? "Save changes" : "Create entry"}
      cancelHref="/admin/experience"
    >
      {isEdit ? <input type="hidden" name="originalSlug" defaultValue={entry?.slug} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Role title" htmlFor="title" errors={errors.title}>
          <TextInput id="title" name="title" defaultValue={entry?.title} required />
        </Field>

        <Field label="Slug" htmlFor="slug" hint="Internal identifier." errors={errors.slug}>
          <TextInput id="slug" name="slug" defaultValue={entry?.slug} required />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Section"
          htmlFor="kind"
          hint="Which heading it appears under on /experience."
          errors={errors.kind}
        >
          <Select id="kind" name="kind" defaultValue={entry?.kind ?? "TECHNICAL"}>
            <option value="TECHNICAL">Technical experience</option>
            <option value="PROFESSIONAL">Professional experience</option>
            <option value="LEADERSHIP">Activities and leadership</option>
          </Select>
        </Field>

        <Field label="Engagement type" htmlFor="engagementType" errors={errors.engagementType}>
          <Select
            id="engagementType"
            name="engagementType"
            defaultValue={entry?.engagementType ?? "EMPLOYMENT"}
          >
            <option value="INTERNSHIP">Internship</option>
            <option value="EMPLOYMENT">Employment</option>
            <option value="CONTRACT">Contract</option>
            <option value="PLATFORM_ENGAGEMENT">Platform engagement</option>
            <option value="VOLUNTEER">Volunteer</option>
            <option value="MEMBERSHIP">Membership</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Organization"
          htmlFor="organization"
          hint="The employer or client. Leave blank for independent work with no single client."
          errors={errors.organization}
        >
          <TextInput
            id="organization"
            name="organization"
            defaultValue={entry?.organization ?? ""}
          />
        </Field>

        <Field
          label="Platform"
          htmlFor="platform"
          hint='Only for marketplace work. Renders as "via Taskrabbit" — never as an employer.'
          errors={errors.platform}
        >
          <TextInput id="platform" name="platform" defaultValue={entry?.platform ?? ""} />
        </Field>
      </div>

      <Field label="Location" htmlFor="location" errors={errors.location}>
        <TextInput id="location" name="location" defaultValue={entry?.location ?? ""} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Start date"
          htmlFor="startDate"
          hint="2025-06 or June 2025."
          errors={errors.startDate}
        >
          <TextInput id="startDate" name="startDate" defaultValue={entry?.startDate} required />
        </Field>

        <Field
          label="End date"
          htmlFor="endDate"
          hint="Leave blank if current."
          errors={errors.endDate}
        >
          <TextInput id="endDate" name="endDate" defaultValue={entry?.endDate ?? ""} />
        </Field>

        <div className="flex items-center gap-2 sm:pt-7">
          <input
            id="current"
            name="current"
            type="checkbox"
            defaultChecked={entry?.current}
            className="accent-accent size-4"
          />
          <label htmlFor="current" className="text-ink text-sm">
            Current role
          </label>
        </div>
      </div>

      <Field label="Summary" htmlFor="summary" errors={errors.summary}>
        <TextArea id="summary" name="summary" defaultValue={entry?.summary} required rows={3} />
      </Field>

      <Field
        label="Highlights"
        htmlFor="highlights"
        hint="One per line."
        errors={errors.highlights}
      >
        <TextArea
          id="highlights"
          name="highlights"
          defaultValue={entry?.highlights.join("\n")}
          rows={4}
        />
      </Field>

      <Field label="Skills" htmlFor="skills" hint="One per line." errors={errors.skills}>
        <TextArea id="skills" name="skills" defaultValue={entry?.skills.join("\n")} rows={4} />
      </Field>

      <div className="border-line grid gap-5 border-t pt-6 sm:grid-cols-2">
        <Field label="Status" htmlFor="status" errors={errors.status}>
          <Select id="status" name="status" defaultValue={entry?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft — not public</option>
            <option value="PUBLISHED">Published — live</option>
          </Select>
        </Field>

        <Field
          label="Sort order"
          htmlFor="sortOrder"
          hint="Lower appears first within its section."
          errors={errors.sortOrder}
        >
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
