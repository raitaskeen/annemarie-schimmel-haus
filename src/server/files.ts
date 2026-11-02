import "server-only";
import { createHash } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { onCloudflareWorkers } from "@/lib/runtime";

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

  if (onCloudflareWorkers) return reencodeWithCloudflareImages(input, maxDimension, quality);

  try {
    // Loaded on demand: the native module exists on the Node server only, never in the Workers bundle.
    const { default: sharp } = await import("sharp");
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

type ImagesBinding = {
  input(stream: ReadableStream<Uint8Array>): {
    transform(t: { width: number; height: number; fit: "scale-down" }): { output(o: { format: "image/webp"; quality: number }): Promise<{ response(): Response }> };
  };
  info(stream: ReadableStream<Uint8Array>): Promise<{ width?: number; height?: number }>;
};

/**
 * Workers: pixel size of a file under /public. There is no disk on Workers; static files
 * come from the assets binding and the Images binding reads their dimensions.
 */
export async function publicImageSizeOnWorkers(pathname: string): Promise<{ width: number; height: number } | null> {
  const { env: bindings } = getCloudflareContext();
  const { ASSETS, IMAGES } = bindings as { ASSETS?: { fetch(input: string): Promise<Response> }; IMAGES?: ImagesBinding };
  if (!ASSETS || !IMAGES) return null;
  try {
    const res = await ASSETS.fetch(new URL(pathname, "https://assets.invalid").toString());
    if (!res.ok || !res.body) return null;
    const info = await IMAGES.info(res.body);
    return info.width && info.height ? { width: info.width, height: info.height } : null;
  } catch {
    return null;
  }
}

/**
 * Cloudflare Workers have no native image library, so uploads go through the Images
 * binding instead: decoded, re-encoded to WebP (metadata such as GPS is dropped) and capped
 * in size, the same guarantees sharp gives on the Node server.
 */
async function reencodeWithCloudflareImages(input: Buffer, maxDimension: number, quality: number): Promise<ProcessedFile> {
  const images = (getCloudflareContext().env as { IMAGES?: ImagesBinding }).IMAGES;
  if (!images) throw new FileRejectedError("type");
  try {
    const result = await images
      .input(new Blob([new Uint8Array(input)]).stream())
      .transform({ width: maxDimension, height: maxDimension, fit: "scale-down" })
      .output({ format: "image/webp", quality });
    const data = Buffer.from(await result.response().arrayBuffer());
    const info = await images.info(new Blob([new Uint8Array(data)]).stream());
    return { data, contentType: "image/webp", size: data.length, width: info.width ?? 0, height: info.height ?? 0, sha256: hash(data), extension: "webp" };
  } catch {
    throw new FileRejectedError("type");
  }
}
