"use client";

import Image from "next/image";
import { useActionState } from "react";

import { Field, FileInput, TextArea, TextInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { Button } from "@/components/ui/button";
import { emptyFormState } from "@/lib/validation/forms";
import {
  deleteProjectImage,
  updateProjectImage,
  uploadProjectImage,
} from "@/server/actions/project-images";
import type { ProjectImage } from "@/types/content";

/**
 * The image manager on a project's edit page.
 *
 * One upload form plus one small form per existing image. Each row is its own
 * component because each needs its own `useActionState` — a single shared
 * state would show one image's error on another's row.
 */

export function ProjectImages({
  slug,
  images,
  storageConfigured,
}: {
  slug: string;
  images: ProjectImage[];
  storageConfigured: boolean;
}) {
  return (
    <section className="border-line mt-12 border-t pt-6">
      <h2 className="text-ink font-serif text-lg">Images</h2>
      <p className="text-ink-muted mt-1 max-w-prose text-sm">
        Screenshots and diagrams, shown in order on the public project page. The first is also the
        card thumbnail on Home and Projects. PNG, JPEG or WebP, up to 4 MB.
      </p>

      {storageConfigured ? (
        <UploadForm slug={slug} />
      ) : (
        /*
          Said up front rather than after someone has picked a file and
          written alt text. A missing token is a setup step, not a failure.
        */
        <p
          role="status"
          className="border-line text-ink-muted mt-6 rounded-md border border-dashed px-3 py-4 text-sm"
        >
          File storage is not configured, so uploads are unavailable. Create a Blob store (Vercel →
          Storage → Blob) and set <code>BLOB_READ_WRITE_TOKEN</code> in the environment.
        </p>
      )}

      {images.length > 0 ? (
        <ul className="mt-10 flex flex-col gap-8">
          {images.map((image) => (
            <li key={image.id}>
              <ImageRow image={image} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted mt-6 text-sm">
          No images yet. The project page renders without a gallery.
        </p>
      )}
    </section>
  );
}

function UploadForm({ slug }: { slug: string }) {
  const [state, formAction] = useActionState(uploadProjectImage, emptyFormState);
  const errors = state.fieldErrors;

  return (
    <div className="mt-6">
      <FormShell
        state={state}
        action={formAction}
        submitLabel="Upload image"
        resetOnSuccess
        successMessage="Image uploaded. It is live on the project page."
      >
        <input type="hidden" name="slug" value={slug} />

        <Field
          label="Image file"
          htmlFor="file"
          hint="PNG, JPEG or WebP. Resize large screenshots first — 4 MB is the limit."
          errors={errors.file}
        >
          <FileInput id="file" name="file" accept="image/png,image/jpeg,image/webp" required />
        </Field>

        <Field
          label="Alt text"
          htmlFor="alt"
          hint="What the image shows, for someone who cannot see it. Not 'screenshot' — describe the content."
          errors={errors.alt}
        >
          <TextInput id="alt" name="alt" required />
        </Field>

        <Field
          label="Caption"
          htmlFor="caption"
          hint="Optional. Printed under the image, visible to everyone."
          errors={errors.caption}
        >
          <TextInput id="caption" name="caption" />
        </Field>
      </FormShell>
    </div>
  );
}

function ImageRow({ image }: { image: ProjectImage }) {
  const [state, formAction] = useActionState(updateProjectImage, emptyFormState);
  const errors = state.fieldErrors;

  // Bound rather than passed through a hidden field: the id is then fixed on
  // the server at render time and cannot be swapped in the submitted payload.
  const remove = deleteProjectImage.bind(null, image.id);

  return (
    <div className="border-line grid gap-6 rounded-lg border p-4 sm:grid-cols-[12rem_1fr]">
      <div className="bg-surface border-line relative aspect-[4/3] overflow-hidden rounded-md border">
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes="12rem"
          className="object-contain"
          // Admin-only and behind auth, so there is nothing to gain from
          // optimizing these thumbnails through the image pipeline.
          unoptimized
        />
      </div>

      <div className="flex flex-col gap-4">
        <FormShell
          state={state}
          action={formAction}
          submitLabel="Save image details"
          successMessage="Image details saved."
        >
          <input type="hidden" name="id" value={image.id} />

          <Field label="Alt text" htmlFor={`alt-${image.id}`} errors={errors.alt}>
            <TextArea id={`alt-${image.id}`} name="alt" defaultValue={image.alt} required />
          </Field>

          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
            <Field label="Caption" htmlFor={`caption-${image.id}`} errors={errors.caption}>
              <TextInput
                id={`caption-${image.id}`}
                name="caption"
                defaultValue={image.caption ?? ""}
              />
            </Field>

            <Field
              label="Order"
              htmlFor={`sortOrder-${image.id}`}
              hint="Lower first."
              errors={errors.sortOrder}
            >
              <TextInput
                id={`sortOrder-${image.id}`}
                name="sortOrder"
                type="number"
                defaultValue={image.sortOrder}
              />
            </Field>
          </div>
        </FormShell>

        {/*
          A separate form, because forms cannot nest — and confirmed, because
          this deletes the stored file as well as the row and there is no
          undo. Every other delete in this admin removes a record that could
          be retyped; this one destroys the only copy of a file.
        */}
        <form
          action={remove}
          onSubmit={(event) => {
            if (!window.confirm("Delete this image? The file is removed permanently.")) {
              event.preventDefault();
            }
          }}
        >
          <Button type="submit" variant="secondary" size="sm">
            Delete image
          </Button>
        </form>

        <p className="text-ink-muted text-xs">
          {image.width && image.height
            ? `${image.width} × ${image.height} px`
            : "Dimensions unknown — the page reserves a default aspect ratio."}
        </p>
      </div>
    </div>
  );
}
