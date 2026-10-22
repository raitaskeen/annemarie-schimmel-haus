/**
 * Top-level sections of the public site (folders under src/app/[lang]). Anything else is
 * answered by the proxy with the prerendered not-found page. Add new sections here — tests/proxy.test.ts
 * fails when a folder is missing from this list.
 */
export const PUBLIC_SECTIONS = new Set([
  "about",
  "contact",
  "courses",
  "enroll",
  "events",
  "exams",
  "gallery",
  "missing",
  "news",
  "newsletter",
  "partners",
  "placement-test",
  "privacy",
  "student-guidelines",
  "terms",
  "track",
]);
