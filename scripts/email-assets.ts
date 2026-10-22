/**
 * Builds the small images used by the email layout (public/email/*). Emails reference
 * them by absolute URL, so they must be deployed with the site. Re-run after a brand change:
 *   bun scripts/email-assets.ts
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const out = "public/email";
await mkdir(out, { recursive: true });

/** Eight-pointed star (the seal of the app icon), as an SVG path centred on 0,0. */
function star(outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

// Watermark: a large, very faint seal with an outline ring, placed in the card's lower corner.
const watermark = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="440" viewBox="-220 -220 440 440">
  <g fill="none" stroke="#477748" stroke-opacity="0.09" stroke-width="2">
    <circle r="206"/><circle r="196" stroke-dasharray="2 7"/>
  </g>
  <mask id="hole"><rect x="-220" y="-220" width="440" height="440" fill="#fff"/><circle r="46" fill="#000"/></mask>
  <path d="${star(180, 112)}" fill="#477748" fill-opacity="0.055" mask="url(#hole)"/>
  <path d="${star(118, 74)}" fill="none" stroke="#477748" stroke-opacity="0.08" stroke-width="2" mask="url(#hole)"/>
  <circle r="46" fill="none" stroke="#477748" stroke-opacity="0.08" stroke-width="2"/>
</svg>`;
await sharp(Buffer.from(watermark)).png({ compressionLevel: 9 }).toFile(`${out}/watermark.png`);

// Seal for the signature block (lime star on the dark green tile, like the app icon).
const seal = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-48 -48 96 96">
  <rect x="-48" y="-48" width="96" height="96" rx="22" fill="#10241c"/>
  <path d="${star(34, 21)}" fill="#92c83e"/><circle r="11" fill="#10241c"/>
</svg>`;
await sharp(Buffer.from(seal)).png({ compressionLevel: 9 }).toFile(`${out}/seal.png`);

// Wordmark for the email header (dark on transparent) and a light copy for dark-mode clients.
const mark = sharp("public/brand/ash-wordmark.png").resize({ width: 360 });
await mark.clone().png({ compressionLevel: 9 }).toFile(`${out}/wordmark.png`);
// Light copy: the wordmark's shape (alpha) filled with the cream text colour.
const { data, info } = await mark.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) [data[i], data[i + 1], data[i + 2]] = [0xee, 0xf3, 0xea];
await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(`${out}/wordmark-light.png`);

console.log("email assets written to", out);
