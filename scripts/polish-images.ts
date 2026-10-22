/**
 * Prepares presentation copies of archive photographs for the public pages:
 *   bun scripts/polish-images.ts ash-fb-0013.webp ash-dslr-1358.webp …
 * Each file in public/images/gallery gets a gentle tone/contrast correction and light
 * sharpening and is written to public/images/polished/<name>.webp (originals stay untouched).
 * Social-media exports that carry blurred letterbox bands are cropped to the real picture
 * (vertical share of the image to keep, measured by eye — add new ones to CROPS).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/images/gallery";
const OUT = "public/images/polished";
const CROPS: Record<string, [top: number, bottom: number]> = {
  "ash-fb-0013.webp": [0.25, 0.74],
};

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: bun scripts/polish-images.ts <file.webp> …");
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
for (const name of files) {
  const file = path.join(SRC, name);
  const { width: W = 0, height: H = 0 } = await sharp(file).metadata();
  const [y0, y1] = CROPS[name] ?? [0, 1];
  const top = Math.round(y0 * H);
  const height = Math.round((y1 - y0) * H);
  await sharp(file)
    .extract({ left: 0, top, width: W, height })
    .modulate({ saturation: 1.06 })
    .linear(1.04, -4) // a touch more contrast without clipping
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 1.2 })
    .webp({ quality: 86, effort: 5 })
    .toFile(path.join(OUT, name));
  console.log(`${name}: ${W}x${H} → ${W}x${height}`);
}
