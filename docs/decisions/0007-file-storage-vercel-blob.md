# 0007 — File storage: Vercel Blob, behind a façade, uploaded through Server Actions

**Status:** Accepted · Phase 9a

## Context

Phase 9 introduces the first binary content: project screenshots and resume PDFs.
Everything the site has stored until now has been text in Postgres, seeded from
`src/content/`. Files cannot live there — they are not text, and they are uploaded by
a person rather than committed by one.

Three questions had to be answered together: where the bytes live, how they get there,
and what the database records about them.

## Decision

### Vercel Blob, reached only through `src/lib/storage.ts`

The store is Vercel Blob. The deployment is already on Vercel, it needs no new account
or credential rotation beyond one token, and its free tier is far above what a portfolio
with a few dozen screenshots will ever use.

The more important half is that **no other module imports `@vercel/blob`.** Actions call
`uploadFile()` and `deleteFile()` and get back URLs. This is the same seam as
`src/server/queries/` (see 0004), for the same reason: the storage provider is an
implementation detail that should be replaceable without touching a feature.

### Uploads go through Server Actions, not client-side upload

`@vercel/blob/client` can upload straight from the browser to Blob, bypassing the
function entirely. That is the right answer for large files and the wrong one here.
Routing bytes through a Server Action means the existing `requireAdmin()` → validate →
mutate → revalidate pipeline applies unchanged, and the file is inspected on a server we
control before it is ever stored. Client-side upload would need its own token-issuing
Route Handler and its own auth check — a second, differently-shaped write path.

The cost is a hard ceiling: **Vercel caps a serverless request body at 4.5 MB and that
limit is not configurable.** `serverActions.bodySizeLimit` is set to `4.5mb` and
`MAX_UPLOAD_BYTES` to 4 MB, so oversized files fail with our message instead of a
platform 413. If files ever need to be larger than that, the answer is client-side
upload, not a larger limit.

### Files are validated by their bytes, not their names

The declared MIME type and the file extension are both supplied by the client and are
trivially forged. `uploadFile()` reads the file's magic bytes and refuses anything whose
contents are not PNG, JPEG, WebP (images) or PDF (documents). The `Content-Type` written
to Blob is derived from the signature, not passed through.

**SVG is refused deliberately**, even though it is an image and would be convenient for
diagrams. An SVG can carry script, and these files are served from a URL a visitor's
browser trusts. That is stored XSS with extra steps.

### The upload happens before the row is written

The file and the row can disagree in two ways, and they are not equally bad:

| Failure              | Result                                                       |
| -------------------- | ------------------------------------------------------------ |
| File stored, no row  | An orphan costing a fraction of a cent. Nobody ever sees it. |
| Row written, no file | A broken image on a public page.                             |

So the upload goes first, and only a successful upload writes a row. Deletes run in the
opposite order for the same reason: the row goes first, then the file, and a failed file
delete is logged rather than thrown — an already-completed delete must not surface as an
error page.

### `ProjectImage` is the one content model without `status`

Every other content model carries `status: DRAFT | PUBLISHED`, and `CLAUDE.md` states
that as a rule. Images are the exception: a gallery's visibility is its project's. A
second publish axis would let a published project silently render no images because they
were all left in draft, which is a worse failure than the flexibility is worth. To take
an image off the site, delete it or reorder it.

`alt` is a required column for a related reason. Alt text that can be skipped is alt text
that is skipped, and these images carry the actual content of a project page.

### The resume records three URLs' worth of information

`fileUrl`, `downloadUrl`, and `pathname`, the last two nullable.

`downloadUrl` exists because **`<a download>` is ignored cross-origin.** The moment the
resume moved from `/public` to a Blob domain, the download button would have quietly
become an "open in this tab" button — a silent regression of exactly the kind this
project keeps writing down. Blob serves a separate URL with
`content-disposition: attachment`; that is what the button points at now.

`pathname` is null for the file still committed under `/public`, and that null is load
bearing: it is how `deleteResumeVersion` knows not to try to delete a file that belongs
to the repository rather than to the store.

### The profile portrait has no alt-text column

`Profile.photoUrl` stands alone: the alt text for a portrait is the person's name, which
the same row already holds. A second field could only ever hold the same fact or a wrong
one, so the hero renders `alt={profile.name}`.

The seed deliberately omits the photo from its UPDATE. Re-seeding is meant to overwrite
text with whatever `src/content` says — but `src/content` has no photo to say anything
about, so including it would reset an uploaded portrait to null and orphan the file.
Uploaded media is not the seed's to reset.

## Consequences

- One new environment variable, `BLOB_READ_WRITE_TOKEN`. When it is absent the admin says
  so plainly and hides the upload forms; nothing throws, and nothing fails silently.
- Uploads are capped at 4 MB. Screenshots must be resized first, which they should be
  anyway.
- Image dimensions are read from file headers by hand (`readImageDimensions`) rather than
  with `sharp` or `image-size`. It is one header read for three formats, against a native
  dependency that would have to build on both Windows and Vercel's Linux builders.
  Parsing is best effort; a failure stores null and the gallery falls back to a default
  aspect ratio.
- `src/content/` remains a text-only seed source. A fresh database has projects and no
  images, which every rendering path treats as normal.
