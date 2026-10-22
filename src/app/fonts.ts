import localFont from "next/font/local";

/**
 * Fonts are committed to the repository (latin subset, variable weights; SIL Open Font
 * License, see ./fonts/LICENSE.md). Builds therefore never depend on Google being
 * reachable, and visitors' browsers never contact a third party.
 */
export const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces.woff2", style: "normal", weight: "100 900" },
    { path: "./fonts/fraunces-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  declarations: [{ prop: "font-optical-sizing", value: "auto" }],
});

export const geist = localFont({
  src: [{ path: "./fonts/geist.woff2", style: "normal", weight: "100 900" }],
  variable: "--font-geist",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
});

export const geistMono = localFont({
  src: [{ path: "./fonts/geist-mono.woff2", style: "normal", weight: "100 900" }],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "Consolas", "monospace"],
});

export const fontVariables = `${fraunces.variable} ${geist.variable} ${geistMono.variable}`;
