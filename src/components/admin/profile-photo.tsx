"use client";

import Image from "next/image";
import { useActionState } from "react";

import { Field, FileInput } from "@/components/admin/form-fields";
import { FormShell } from "@/components/admin/form-shell";
import { Button } from "@/components/ui/button";
import { emptyFormState } from "@/lib/validation/forms";
import { removeProfilePhoto, uploadProfilePhoto } from "@/server/actions/content";

/**
 * The portrait in the home page hero.
 *
 * Separate from `ProfileForm` because it is a different kind of edit: text
 * changes are typed and saved together, while a photo is replaced rarely and
 * on its own. Uploading one does not require re-saving the bio, and a failed
 * upload does not reject unrelated text.
 *
 * There is no alt-text field. A portrait's alt text is the person's name,
 * which the profile already holds.
 */
export function ProfilePhoto({
  photoUrl,
  name,
  storageConfigured,
}: {
  photoUrl: string | null;
  name: string;
  storageConfigured: boolean;
}) {
  const [state, formAction] = useActionState(uploadProfilePhoto, emptyFormState);

  return (
    <section className="border-line mt-12 border-t pt-6">
      <h2 className="text-ink font-serif text-lg">Photo</h2>
      <p className="text-ink-muted mt-1 max-w-prose text-sm">
        Shown beside the headline on the home page. A head-and-shoulders crop works best — the frame
        is portrait, and anything much taller gets cropped at the bottom. PNG, JPEG or WebP, up to 4
        MB.
      </p>

      <div className="mt-6 grid gap-8 sm:grid-cols-[14rem_1fr]">
        <div className="flex flex-col gap-3">
          {photoUrl ? (
            <>
              <div className="bg-surface border-line relative aspect-[4/5] overflow-hidden rounded-lg border">
                <Image
                  src={photoUrl}
                  alt={name}
                  fill
                  sizes="14rem"
                  className="object-cover object-top"
                />
              </div>

              <form action={removeProfilePhoto}>
                <Button type="submit" variant="secondary" size="sm">
                  Remove photo
                </Button>
              </form>

              <p className="text-ink-muted text-xs">
                Removing it returns the hero to a single text column. Uploading a new one replaces
                this file and deletes the old one.
              </p>
            </>
          ) : (
            <div className="border-line text-ink-muted flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs">
              No photo. The hero renders as text only.
            </div>
          )}
        </div>

        {storageConfigured ? (
          <FormShell
            state={state}
            action={formAction}
            submitLabel={photoUrl ? "Replace photo" : "Upload photo"}
            resetOnSuccess
            successMessage="Photo saved. It is live on the home page."
          >
            <Field
              label="Image file"
              htmlFor="photo"
              hint="This preview updates after the upload finishes."
              errors={state.fieldErrors.file}
            >
              <FileInput id="photo" name="file" accept="image/png,image/jpeg,image/webp" required />
            </Field>
          </FormShell>
        ) : (
          <p
            role="status"
            className="border-line text-ink-muted self-start rounded-md border border-dashed px-3 py-4 text-sm"
          >
            File storage is not configured, so uploads are unavailable. Set{" "}
            <code>BLOB_READ_WRITE_TOKEN</code> in the environment.
          </p>
        )}
      </div>
    </section>
  );
}
