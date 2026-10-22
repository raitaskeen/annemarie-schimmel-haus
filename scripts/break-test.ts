/**
 * Hostile-input checks against a running site: each probe sends something a careless
 * or malicious client might send and asserts the app answers safely (no 500, no data,
 * no stack trace, security headers present). Safe to run locally or on staging:
 *
 *   bun scripts/break-test.ts --url http://localhost:4000
 */
export {};

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const base = (args.get("url") ?? "http://localhost:4000").replace(/\/$/, "");

type Probe = { name: string; path: string; init?: RequestInit; expect: (r: Response, body: string) => string | null };
// Stack frames, driver errors or secrets in a response body (asset URLs under /_next are fine).
const noLeak = (body: string) =>
  /\bat \w+ \(|ECONNREFUSED|password_hash|DATABASE_URL|AUTH_SECRET|\.tsx?:\d+:\d+/.test(body.replace(/\/_next\/[^"' ]+/g, "")) ? "response leaks internals" : null;
// Streamed pages answer an unknown slug with the not-found UI and a noindex tag rather than a 404 status.
const notFound = (r: Response, body: string) =>
  r.status === 404 || (r.status === 200 && body.includes('name="robots" content="noindex"') && /could not be found|nicht gefunden/i.test(body)) ? noLeak(body) : `expected not-found, got ${r.status}`;
const status =
  (...ok: number[]) =>
  (r: Response, body: string) =>
    ok.includes(r.status) ? noLeak(body) : `expected ${ok.join("/")}, got ${r.status}`;

const probes: Probe[] = [
  { name: "home renders", path: "/en", expect: status(200) },
  { name: "unknown locale", path: "/xx/courses", expect: status(404, 307, 308) },
  { name: "unknown course", path: "/en/courses/not-a-course", expect: notFound },
  { name: "unknown event", path: "/en/events/%27%22%3E%3Cscript%3E", expect: notFound },
  {
    name: "unknown section: fast, noindex",
    path: "/en/no-such-section",
    expect: (r, b) => (r.headers.get("x-robots-tag") === "noindex" && /different path/.test(b) ? noLeak(b) : `got ${r.status} without noindex`),
  },
  { name: "unknown section: 404 for crawlers", path: "/en/no-such-section", init: { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }, expect: status(404) },
  { name: "scanner probe is cheap", path: "/wp-login.php", expect: (r, b) => (r.status === 404 && b.length < 100 ? null : `got ${r.status}, ${b.length} bytes`) },
  { name: "dotfile probe is cheap", path: "/.env", expect: (r, b) => (r.status === 404 && b.length < 100 ? null : `got ${r.status}, ${b.length} bytes`) },
  { name: "path traversal", path: "/files/..%2F..%2Fetc%2Fpasswd", expect: status(400, 401, 403, 404) },
  { name: "private file without session", path: "/files/00000000-0000-0000-0000-000000000000", expect: status(401, 403, 404) },
  { name: "private file bad id", path: "/files/not-a-uuid", expect: status(400, 401, 403, 404) },
  { name: "media bad id", path: "/media/not-a-uuid", expect: status(400, 404) },
  { name: "admin needs sign-in", path: "/admin", init: { redirect: "manual" }, expect: status(302, 303, 307, 308) },
  { name: "admin export needs sign-in", path: "/admin/enrollments/export", init: { redirect: "manual" }, expect: status(302, 303, 307, 308, 401, 403, 404) },
  { name: "cron without secret", path: "/api/cron/maintenance", init: { method: "POST" }, expect: status(401, 404) },
  { name: "cron wrong secret", path: "/api/cron/maintenance", init: { method: "POST", headers: { authorization: "Bearer nope" } }, expect: status(401, 404) },
  {
    name: "webhook bad signature",
    path: "/api/whatsapp/webhook",
    init: { method: "POST", body: '{"entry":[]}', headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=00" } },
    expect: status(401, 403, 404),
  },
  { name: "webhook verify wrong token", path: "/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1", expect: status(403, 404) },
  { name: "upload without origin", path: "/api/admin/media", init: { method: "POST", body: "x" }, expect: status(403) },
  { name: "upload with null origin", path: "/api/admin/media", init: { method: "POST", body: "x", headers: { origin: "null" } }, expect: status(403) },
  { name: "upload cross-site", path: "/api/admin/media", init: { method: "POST", body: "x", headers: { origin: "https://evil.example" } }, expect: status(403) },
  { name: "challenge is not cached", path: "/api/challenge", expect: (r, b) => (r.headers.get("cache-control")?.includes("no-store") ? noLeak(b) : "challenge cacheable") },
  { name: "huge query string", path: `/en/track?ref=${"A".repeat(6000)}`, expect: status(200, 400, 414, 431) },
  {
    name: "server action garbage",
    path: "/en/contact",
    init: { method: "POST", body: "garbage", headers: { "next-action": "0".repeat(42), "content-type": "text/plain", origin: base } },
    expect: (r, b) => (r.status >= 500 ? `got ${r.status}` : noLeak(b)),
  },
  {
    name: "server action cross-site",
    path: "/en/contact",
    init: { method: "POST", body: "[]", headers: { "next-action": "0".repeat(42), origin: "https://evil.example", "content-type": "text/plain" } },
    expect: (r) => (r.status >= 500 && r.status !== 500 ? `got ${r.status}` : r.status === 200 ? "cross-site action accepted" : null),
  },
  {
    name: "security headers",
    path: "/en",
    expect: (r) => {
      const missing = ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy"].filter((h) => !r.headers.get(h));
      return missing.length ? `missing ${missing.join(", ")}` : null;
    },
  },
  { name: "admin is noindex/no-store", path: "/admin/login", expect: (r) => (r.headers.get("cache-control")?.includes("no-store") ? null : "admin login cacheable") },
];

let failed = 0;
for (const p of probes) {
  try {
    const r = await fetch(base + p.path, { redirect: "manual", ...p.init, signal: AbortSignal.timeout(20_000) });
    const body = await r.text();
    const problem = p.expect(r, body);
    if (problem) failed++;
    console.log(`${problem ? "FAIL" : "ok  "}  ${p.name.padEnd(32)} ${r.status}${problem ? `  — ${problem}` : ""}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${p.name.padEnd(32)} ${(e as Error).message}`);
  }
}

// Burst: many challenge requests at once must all succeed quickly (the bot quiz is on every form).
const t0 = performance.now();
const burst = await Promise.all(Array.from({ length: 200 }, () => fetch(`${base}/api/challenge`).then((r) => r.status).catch(() => 0)));
// Status 0 = the operating system refused the TCP connection (listen backlog full, common on
// Windows when 200 sockets open in the same millisecond); that is not an application error.
const bad = burst.filter((s) => s !== 200 && s !== 0).length;
const refused = burst.filter((s) => s === 0).length;
console.log(
  `${bad ? "FAIL" : "ok  "}  200 parallel challenges           ${Math.round(performance.now() - t0)} ms, ${bad} error responses${refused ? `, ${refused} connections refused by the OS (not the app)` : ""}`,
);
if (bad) failed++;

console.log(failed ? `\n${failed} probe(s) failed` : "\nAll probes passed");
process.exit(failed ? 1 : 0);
