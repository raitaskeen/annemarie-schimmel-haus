import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_SECTIONS } from "@/lib/public-sections";

describe("public sections", () => {
  it("lists every top-level folder of the public site, and nothing else", () => {
    const folders = readdirSync(join(process.cwd(), "src/app/[lang]"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("[") && !d.name.startsWith("("))
      .map((d) => d.name);
    for (const folder of folders) expect(PUBLIC_SECTIONS.has(folder), `add "${folder}" to src/lib/public-sections.ts`).toBe(true);
    expect([...PUBLIC_SECTIONS].filter((s) => !folders.includes(s))).toEqual([]);
  });
});
