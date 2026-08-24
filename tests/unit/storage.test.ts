import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteFile,
  isStorageConfigured,
  MAX_UPLOAD_BYTES,
  readImageDimensions,
  uploadFile,
} from "@/lib/storage";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * THE UPLOAD BOUNDARY — the one place a browser hands this server arbitrary
 * bytes. Ported from the Phase 9a scratch script, which ran these once and
 * then protected nothing.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * `@vercel/blob` is mocked, so nothing here touches a real store: every
 * check that matters happens before `put()` is reached, and the ones that
 * happen after are about what `put()` is CALLED with. The round trip
 * against a real store was verified separately in Phase 9a — that needs a
 * token and a network, which a unit suite must not.
 */

const { put, del } = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));

vi.mock("@vercel/blob", () => ({ put, del }));

/** A minimal but structurally real PNG header: signature + IHDR. */
function pngBytes(width = 800, height = 600): Uint8Array {
  const bytes = new Uint8Array(33);
  const view = new DataView(bytes.buffer);

  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  view.setUint32(8, 13); // IHDR chunk length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);

  return bytes;
}

/** SOI, an APP0 segment of realistic length, then the SOF0 carrying the size. */
function jpegBytes(width = 1024, height = 768): Uint8Array {
  const bytes = new Uint8Array(48);
  const view = new DataView(bytes.buffer);

  bytes.set([0xff, 0xd8], 0); // SOI
  bytes.set([0xff, 0xe0], 2); // APP0 — the metadata the parser must skip
  view.setUint16(4, 16); // its length, which is how far to skip
  bytes.set([0x4a, 0x46, 0x49, 0x46, 0x00], 6); // "JFIF\0"

  bytes.set([0xff, 0xc0], 20); // SOF0, at 2 + 2 + 16
  view.setUint16(22, 17);
  bytes[24] = 8; // sample precision
  view.setUint16(25, height); // height precedes width in a SOF
  view.setUint16(27, width);
  bytes[29] = 3; // component count

  return bytes;
}

function riffHeader(bytes: Uint8Array, format: string): DataView {
  const view = new DataView(bytes.buffer);

  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, bytes.length - 8, true); // file size, little-endian
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  bytes.set(
    [...format].map((character) => character.charCodeAt(0)),
    12,
  );
  view.setUint32(16, bytes.length - 20, true); // chunk size

  return view;
}

/** Lossy WebP: the size lives in the VP8 frame header after the sync code. */
function webpLossyBytes(width = 320, height = 240): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = riffHeader(bytes, "VP8 ");

  bytes.set([0x9d, 0x01, 0x2a], 23); // start code
  view.setUint16(26, width, true);
  view.setUint16(28, height, true);

  return bytes;
}

/** Lossless WebP: width and height are packed into 14 bits each. */
function webpLosslessBytes(width = 100, height = 50): Uint8Array {
  const bytes = new Uint8Array(30);
  const view = riffHeader(bytes, "VP8L");

  bytes[20] = 0x2f; // VP8L signature byte
  view.setUint32(21, (width - 1) | ((height - 1) << 14), true);

  return bytes;
}

/** Extended WebP: two 24-bit little-endian values, each stored minus one. */
function webpExtendedBytes(width = 4000, height = 3000): Uint8Array {
  const bytes = new Uint8Array(30);
  const view = riffHeader(bytes, "VP8X");

  for (const [offset, value] of [
    [24, width - 1],
    [27, height - 1],
  ] as const) {
    view.setUint8(offset, value & 0xff);
    view.setUint8(offset + 1, (value >> 8) & 0xff);
    view.setUint8(offset + 2, (value >> 16) & 0xff);
  }

  return bytes;
}

function pdfBytes(): Uint8Array {
  return new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n");
}

/** An SVG carrying script — the attack the magic-byte check exists to stop. */
function svgBytes(): Uint8Array {
  return new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>',
  );
}

function fileOf(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes as BlobPart], name, { type });
}

describe("isStorageConfigured", () => {
  it("is false without a token and true with one", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(isStorageConfigured()).toBe(false);

    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    expect(isStorageConfigured()).toBe(true);
  });
});

describe("uploadFile", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    // `mockReset` drops queued `…Once` values as well as recorded calls;
    // `clearAllMocks` would leave an unconsumed one for the next test.
    put.mockReset();
    del.mockReset();
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";

    put.mockImplementation(async (pathname: string) => ({
      url: `https://example.public.blob.vercel-storage.com/${pathname}`,
      downloadUrl: `https://example.public.blob.vercel-storage.com/${pathname}?download=1`,
      pathname,
    }));
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalToken;
  });

  it("refuses, without throwing, when no store is configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const result = await uploadFile({
      file: fileOf(pngBytes(), "shot.png", "image/png"),
      kind: "image",
      pathname: "projects/shot.png",
    });

    expect(result.ok).toBe(false);
    // A missing token is a setup state, so the message must name the variable.
    if (!result.ok) expect(result.message).toContain("BLOB_READ_WRITE_TOKEN");
    expect(put).not.toHaveBeenCalled();
  });

  const accepted: [
    label: string,
    bytes: () => Uint8Array,
    name: string,
    declaredType: string,
    storedType: string,
  ][] = [
    ["PNG", () => pngBytes(), "shot.png", "image/png", "image/png"],
    ["JPEG", () => jpegBytes(), "shot.jpg", "image/jpeg", "image/jpeg"],
    ["lossy WebP", () => webpLossyBytes(), "shot.webp", "image/webp", "image/webp"],
    ["lossless WebP", () => webpLosslessBytes(), "shot.webp", "image/webp", "image/webp"],
  ];

  it.each(accepted)("accepts a %s and stores it", async (_label, bytes, name, type, storedType) => {
    const result = await uploadFile({
      file: fileOf(bytes(), name, type),
      kind: "image",
      pathname: `projects/${name}`,
    });

    expect(result.ok).toBe(true);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0]?.[2]).toMatchObject({ access: "public", contentType: storedType });
  });

  it("accepts a PDF where a document is expected", async () => {
    const result = await uploadFile({
      file: fileOf(pdfBytes(), "resume.pdf", "application/pdf"),
      kind: "document",
      pathname: "resume/resume.pdf",
    });

    expect(result.ok).toBe(true);
    expect(put.mock.calls[0]?.[2]).toMatchObject({ contentType: "application/pdf" });
  });

  it("refuses an SVG that claims to be a PNG", async () => {
    /*
      The whole reason uploads are checked by their bytes. An SVG can carry
      script, and it would be served from a URL the visitor's browser
      trusts — stored XSS behind a file rename. Both the extension and the
      declared type here say PNG; only the bytes disagree.
    */
    const result = await uploadFile({
      file: fileOf(svgBytes(), "logo.png", "image/png"),
      kind: "image",
      pathname: "projects/logo.png",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/renaming a file does not change what it is/);
    expect(put).not.toHaveBeenCalled();
  });

  it("refuses a PDF where an image is expected, and an image where a PDF is", async () => {
    const asImage = await uploadFile({
      file: fileOf(pdfBytes(), "shot.png", "image/png"),
      kind: "image",
      pathname: "projects/shot.png",
    });

    const asDocument = await uploadFile({
      file: fileOf(pngBytes(), "resume.pdf", "application/pdf"),
      kind: "document",
      pathname: "resume/resume.pdf",
    });

    expect(asImage.ok).toBe(false);
    expect(asDocument.ok).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("derives the stored content type from the bytes, not the declared type", async () => {
    // A JPEG uploaded under a .png name and an image/png header. What the
    // CDN serves must describe what the file actually is.
    const result = await uploadFile({
      file: fileOf(jpegBytes(), "photo.png", "image/png"),
      kind: "image",
      pathname: "projects/photo.png",
    });

    expect(result.ok).toBe(true);
    expect(put.mock.calls[0]?.[2]).toMatchObject({ contentType: "image/jpeg" });
  });

  it("refuses an empty file", async () => {
    const result = await uploadFile({
      file: fileOf(new Uint8Array(0), "empty.png", "image/png"),
      kind: "image",
      pathname: "projects/empty.png",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Choose a file/);
  });

  it("refuses a file over the size limit, before reading its bytes", async () => {
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    oversized.set(pngBytes(), 0);

    const result = await uploadFile({
      file: fileOf(oversized, "huge.png", "image/png"),
      kind: "image",
      pathname: "projects/huge.png",
    });

    expect(result.ok).toBe(false);
    // The message states both the file's size and the limit, so the admin
    // knows how much to shrink it by.
    if (!result.ok) expect(result.message).toMatch(/4\.0 MB/);
    expect(put).not.toHaveBeenCalled();
  });

  it("accepts a file at exactly the limit", async () => {
    const atLimit = new Uint8Array(MAX_UPLOAD_BYTES);
    atLimit.set(pngBytes(), 0);

    const result = await uploadFile({
      file: fileOf(atLimit, "big.png", "image/png"),
      kind: "image",
      pathname: "projects/big.png",
    });

    expect(result.ok).toBe(true);
  });

  it("sanitizes a hostile pathname", async () => {
    await uploadFile({
      file: fileOf(pngBytes(), "x.png", "image/png"),
      // `file.name` comes from the browser and can be anything.
      pathname: "projects/../../../etc/pa ss wd?.png",
      kind: "image",
    });

    const stored = put.mock.calls[0]?.[0] as string;

    expect(stored).not.toContain("..");
    expect(stored).not.toContain(" ");
    expect(stored).not.toContain("?");
    expect(stored).toBe("projects/etc/pa-ss-wd-.png");
  });

  it("falls back to a generated path when the name is entirely unusable", async () => {
    await uploadFile({
      file: fileOf(pngBytes(), "x.png", "image/png"),
      pathname: "../../..",
      kind: "image",
    });

    expect(put.mock.calls[0]?.[0]).toMatch(/^uploads\/file-\d+$/);
  });

  it("adds a random suffix by default and omits it when asked", async () => {
    // A resume is saved under its last path segment, so
    // `Bidipta-Roy-Resume-x1y2z3.pdf` in someone's Downloads looks broken.
    await uploadFile({
      file: fileOf(pngBytes(), "a.png", "image/png"),
      kind: "image",
      pathname: "projects/a.png",
    });

    await uploadFile({
      file: fileOf(pdfBytes(), "r.pdf", "application/pdf"),
      kind: "document",
      pathname: "resume/Bidipta-Roy-Resume.pdf",
      unique: false,
    });

    expect(put.mock.calls[0]?.[2]).toMatchObject({ addRandomSuffix: true, allowOverwrite: false });
    expect(put.mock.calls[1]?.[2]).toMatchObject({ addRandomSuffix: false, allowOverwrite: true });
  });

  it("reports a failed store as a value, so no row is written against it", async () => {
    /*
      "Store the file before the row." An upload that throws must come back
      as ok:false rather than an exception, because the caller's next step
      is to save a row pointing at the URL.
    */
    put.mockRejectedValueOnce(new Error("network down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await uploadFile({
      file: fileOf(pngBytes(), "a.png", "image/png"),
      kind: "image",
      pathname: "projects/a.png",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Nothing was saved/);

    errors.mockRestore();
  });
});

describe("deleteFile", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    put.mockReset();
    del.mockReset();
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalToken;
  });

  it("deletes the file", async () => {
    await deleteFile("https://example.public.blob.vercel-storage.com/a.png");
    expect(del).toHaveBeenCalledWith("https://example.public.blob.vercel-storage.com/a.png");
  });

  it("never throws, so a failed delete cannot block removing the row", async () => {
    // An orphaned blob costs a fraction of a cent. A project image the
    // admin cannot get rid of costs rather more.
    del.mockRejectedValueOnce(new Error("gone"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteFile("https://example.com/a.png")).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();

    errors.mockRestore();
  });

  it("does nothing without a configured store", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    await deleteFile("https://example.com/a.png");
    expect(del).not.toHaveBeenCalled();
  });
});

describe("readImageDimensions", () => {
  /*
    Best effort by design: `next/image` uses the ratio to reserve space and
    avoid layout shift, but a header this cannot parse must return null
    rather than block an upload.
  */
  const parsable: [label: string, bytes: () => Uint8Array, width: number, height: number][] = [
    ["PNG", () => pngBytes(1200, 630), 1200, 630],
    ["JPEG", () => jpegBytes(1024, 768), 1024, 768],
    ["lossy WebP", () => webpLossyBytes(320, 240), 320, 240],
    ["lossless WebP", () => webpLosslessBytes(100, 50), 100, 50],
    ["extended WebP", () => webpExtendedBytes(4000, 3000), 4000, 3000],
  ];

  it.each(parsable)("reads %s dimensions from the header", async (_label, bytes, width, height) => {
    const dimensions = await readImageDimensions(fileOf(bytes(), "a", "image/png"));
    expect(dimensions).toEqual({ width, height });
  });

  const unparsable: [label: string, bytes: () => Uint8Array][] = [
    ["a PDF", () => pdfBytes()],
    ["an SVG", () => svgBytes()],
    ["a truncated PNG", () => pngBytes().slice(0, 10)],
    ["an empty file", () => new Uint8Array(0)],
  ];

  it.each(unparsable)("returns null for %s instead of throwing", async (_label, bytes) => {
    await expect(readImageDimensions(fileOf(bytes(), "a", "image/png"))).resolves.toBeNull();
  });
});
