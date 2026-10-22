import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/avif" | "application/pdf";

/** Real file type from magic bytes, never trust the browser-declared type. */
export function sniff(buf: Uint8Array): SniffedType | null {
  if (buf.length < 12) return null;
  const ascii = (s: number, e: number) => String.fromCharCode(...buf.subarray(s, e));
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "image/avif";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export type ProcessedFile = { data: Buffer; contentType: string; size: number; width: number; height: number; sha256: string; extension: string };

export class FileRejectedError extends Error {}

/**
 * Validates and normalises an upload. Images are decoded and re-encoded to WebP
 * (strips EXIF/GPS metadata and any embedded payload, caps dimensions); PDFs
 * are accepted only with a valid header and are always served as downloads.
 */
export async function processUpload(
  file: File,
  { maxBytes, allow, maxDimension = 2400, quality = 82 }: { maxBytes: number; allow: readonly string[]; maxDimension?: number; quality?: number },
): Promise<ProcessedFile> {
  if (file.size === 0) throw new FileRejectedError("empty");
  if (file.size > maxBytes) throw new FileRejectedError("too_large");
  const input = Buffer.from(await file.arrayBuffer());
  const type = sniff(input);
  if (!type || !allow.includes(type)) throw new FileRejectedError("type");

  if (type === "application/pdf") {
    if (!input.subarray(Math.max(0, input.length - 1024)).toString("latin1").includes("%%EOF")) {
      throw new FileRejectedError("type");
    }
    return { data: input, contentType: type, size: input.length, width: 0, height: 0, sha256: hash(input), extension: "pdf" };
  }

  try {
    const pipeline = sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 });
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return { data, contentType: "image/webp", size: data.length, width: info.width, height: info.height, sha256: hash(data), extension: "webp" };
  } catch {
    throw new FileRejectedError("type");
  }
}

const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
