import "server-only";

import { del, put } from "@vercel/blob";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * STORAGE FAÇADE — the only module that knows files live in Vercel Blob.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The same idea as `src/server/queries/`: actions call `uploadFile()` and get
 * back a URL. They do not import `@vercel/blob`, do not know a token exists,
 * and would not change if this moved to S3. See docs/decisions/0007.
 *
 * Uploads are the one place in this codebase where a browser hands the server
 * arbitrary bytes, so everything here is deliberately suspicious of its input:
 *
 *   - The declared MIME type is ignored in favour of the file's magic bytes.
 *     `Content-Type` is set by the client and is trivially forged; a `.png`
 *     that is actually an HTML document with a script in it, served from a
 *     public URL, is stored XSS.
 *   - SVG is refused even though it is an image, for the same reason: it can
 *     carry script, and it is served from a URL a visitor's browser trusts.
 *   - Size is checked here as well as in the form, because the form is UX.
 */

/** Storage failures are values, not exceptions — actions surface them as field errors. */
export type UploadResult =
  { ok: true; url: string; downloadUrl: string; pathname: string } | { ok: false; message: string };

/**
 * Vercel caps a serverless request body at 4.5 MB, and a Server Action upload
 * is one request carrying the file plus every other form field. 4 MB leaves
 * room for the rest of the payload and still fails on OUR side, with a
 * readable message, rather than as a platform 413 the form cannot explain.
 *
 * Kept in step with `serverActions.bodySizeLimit` in next.config.ts. If you
 * raise one, raise the other — and note that above ~4.5 MB neither helps,
 * because the platform limit is not configurable. That is the point at which
 * this needs client-side upload (`@vercel/blob/client`), which uploads
 * straight to Blob and never routes the bytes through a function.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type FileKind = "image" | "document";

/**
 * Magic-byte signatures, checked against the head of the file.
 *
 * `offset` is where the bytes must appear; WebP needs two windows because its
 * container is `RIFF....WEBP` with the file size in between.
 */
const SIGNATURES: Record<
  FileKind,
  { label: string; extension: string; match: (head: Uint8Array) => boolean }[]
> = {
  image: [
    {
      label: "PNG",
      extension: "png",
      match: (head) => startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
    {
      label: "JPEG",
      extension: "jpg",
      match: (head) => startsWith(head, [0xff, 0xd8, 0xff]),
    },
    {
      label: "WebP",
      extension: "webp",
      match: (head) =>
        startsWith(head, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(head.subarray(8), [0x57, 0x45, 0x42, 0x50]),
    },
  ],
  document: [
    {
      label: "PDF",
      extension: "pdf",
      match: (head) => startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d]),
    },
  ],
};

const ACCEPTED: Record<FileKind, string> = {
  image: "PNG, JPEG or WebP",
  document: "PDF",
};

function startsWith(head: Uint8Array, bytes: number[]): boolean {
  return bytes.every((byte, index) => head[index] === byte);
}

/**
 * Make a storage path safe to use.
 *
 * Callers build paths partly from `file.name`, which comes from the browser
 * and can be anything: `../../secrets.png`, a leading slash, a 300-character
 * name, control characters. Blob treats a pathname as an opaque string rather
 * than a filesystem path, so this is not a traversal hole — but a stored file
 * named `../../x.png` is a mess to find, to delete, and to reason about, and
 * "the client picked it" is never a good reason to store something verbatim.
 *
 * Each segment is reduced to a conservative charset, `.` and `..` segments are
 * dropped, and the whole path is length-capped.
 */
function sanitizePathname(pathname: string): string {
  const segments = pathname
    .split("/")
    .map((segment) =>
      segment
        .normalize("NFKD")
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80),
    )
    .filter((segment) => segment !== "" && segment !== "." && segment !== "..");

  // Every caller supplies a prefix, so an empty result means the input was
  // entirely unusable. Falling back keeps a pathological filename from
  // becoming an upload failure the admin cannot act on.
  return segments.length > 0 ? segments.join("/") : `uploads/file-${Date.now()}`;
}

/**
 * True when a Blob store is reachable.
 *
 * The admin uses this to say "file storage is not configured" up front,
 * instead of letting someone fill in a caption and pick a file before finding
 * out. A missing token is a setup state, not an error.
 */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Store a file and return its public URL.
 *
 * `pathname` is the desired path within the store, without a leading slash.
 * With `unique: true` a random suffix is appended, so callers never have to
 * think about collisions; pass `false` only when the exact filename is
 * user-visible — a downloaded PDF is saved under the last path segment, and
 * `Bidipta-Roy-Resume-x1y2z3.pdf` in someone's Downloads folder looks broken.
 */
export async function uploadFile({
  file,
  kind,
  pathname,
  unique = true,
}: {
  file: File;
  kind: FileKind;
  pathname: string;
  unique?: boolean;
}): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    return {
      ok: false,
      message:
        "File storage is not configured. Set BLOB_READ_WRITE_TOKEN in the environment (Vercel → Storage → Blob) and try again.",
    };
  }

  if (file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signature = SIGNATURES[kind].find((candidate) => candidate.match(head));

  if (!signature) {
    return {
      ok: false,
      message: `That file is not ${ACCEPTED[kind]}. Its contents were checked, not its name — renaming a file does not change what it is.`,
    };
  }

  try {
    const blob = await put(sanitizePathname(pathname), file, {
      access: "public",
      addRandomSuffix: unique,
      allowOverwrite: !unique,
      // Derived from the signature rather than passed through from the
      // browser, so the type the CDN serves is the type the bytes are.
      contentType: contentTypeFor(signature.extension),
    });

    return {
      ok: true,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
    };
  } catch (error) {
    // The upload failed and nothing was written, so the caller must not go on
    // to save a row pointing at a URL that does not exist.
    console.error("Blob upload failed", error);

    return {
      ok: false,
      message: "The file could not be uploaded. Nothing was saved — please try again.",
    };
  }
}

/**
 * Remove a stored file. Never throws.
 *
 * Deleting the row matters; deleting the bytes is housekeeping. If this fails
 * the result is an orphaned blob costing a fraction of a cent, which is a far
 * better outcome than a failed delete leaving a project image the admin
 * cannot get rid of.
 */
export async function deleteFile(url: string): Promise<void> {
  if (!isStorageConfigured()) return;

  try {
    await del(url);
  } catch (error) {
    console.error("Blob delete failed — orphaned file", url, error);
  }
}

function contentTypeFor(extension: string): string {
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "application/pdf";
  }
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Intrinsic dimensions, read from the file header.
 *
 * Best effort by design: `next/image` needs an aspect ratio to reserve space
 * before the image loads, and knowing it prevents layout shift. When parsing
 * fails — an unusual but perfectly valid JPEG, say — the caller stores null
 * and the gallery falls back to a default ratio. A missing dimension must
 * never block an upload.
 *
 * Done by hand rather than with `sharp` or `image-size`: it is one header
 * read for three formats, against a native dependency that would need to
 * build on both Windows and Vercel's Linux builders.
 */
export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  // Enough for a PNG/WebP header and for scanning a JPEG's opening segments.
  const buffer = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  try {
    if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) {
      // IHDR is always the first chunk: width and height at bytes 16 and 20.
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }

    if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46])) {
      return readWebpDimensions(buffer, view);
    }

    if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
      return readJpegDimensions(buffer, view);
    }
  } catch {
    // A truncated or unusual header. Fall through to null.
  }

  return null;
}

function readWebpDimensions(
  buffer: Uint8Array,
  view: DataView,
): { width: number; height: number } | null {
  // Three sub-formats, each storing its size differently.
  const format = String.fromCharCode(...buffer.subarray(12, 16));

  if (format === "VP8X") {
    return {
      width: 1 + readUint24LE(view, 24),
      height: 1 + readUint24LE(view, 27),
    };
  }

  if (format === "VP8 ") {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  if (format === "VP8L") {
    const bits = view.getUint32(21, true);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }

  return null;
}

function readJpegDimensions(
  buffer: Uint8Array,
  view: DataView,
): { width: number; height: number } | null {
  let offset = 2;

  // Walk the segment chain to the start-of-frame marker, which is the only
  // one carrying the image size. Everything before it is metadata of
  // unpredictable length, which is why this cannot be a fixed offset.
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === undefined) return null;

    // SOF0–SOF15, excluding the non-frame markers that share the range.
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      // Height precedes width in a SOF segment, which is the opposite of
      // every other format here — hence reading them out of order.
      return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
    }

    offset += 2 + view.getUint16(offset + 2);
  }

  return null;
}

function readUint24LE(view: DataView, offset: number): number {
  return (
    view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16)
  );
}
