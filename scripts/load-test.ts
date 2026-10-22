/**
 * Small HTTP load generator (no dependencies). Runs a mix of public pages and APIs with
 * a fixed number of concurrent virtual users and prints throughput, latency percentiles
 * and status codes per route. Use it against a production build, never the dev server:
 *
 *   bun scripts/load-test.ts --url http://localhost:4000 --users 50 --seconds 30
 *   bun scripts/load-test.ts --url https://staging.example.com --users 200 --ramp 10
 *
 * It only sends GET requests and never submits forms, so it is safe on a live site,
 * but agree on a time window with the hosting provider before testing production.
 */
export {};

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);

const base = (args.get("url") ?? "http://localhost:4000").replace(/\/$/, "");
const users = Number(args.get("users") ?? 50);
const seconds = Number(args.get("seconds") ?? 30);
const ramp = Number(args.get("ramp") ?? 5);
const timeoutMs = Number(args.get("timeout") ?? 15_000);

// Weighted route mix, roughly what real visitors do.
const routes: [path: string, weight: number][] = [
  ["/en", 20],
  ["/de", 6],
  ["/en/courses", 14],
  ["/en/events", 10],
  ["/en/exams", 5],
  ["/en/placement-test", 5],
  ["/en/about", 4],
  ["/en/contact", 4],
  ["/en/gallery", 4],
  ["/en/news", 4],
  ["/en/track", 6],
  ["/api/challenge", 10],
  ["/api/health", 2],
  ["/en/does-not-exist", 2],
];
const total = routes.reduce((s, [, w]) => s + w, 0);
const pick = () => {
  let r = Math.random() * total;
  for (const [p, w] of routes) if ((r -= w) < 0) return p;
  return routes[0][0];
};

type Stat = { times: number[]; codes: Map<string, number>; bytes: number };
const stats = new Map<string, Stat>();
const record = (path: string, ms: number, code: string, bytes: number) => {
  const s: Stat = stats.get(path) ?? { times: [], codes: new Map(), bytes: 0 };
  s.times.push(ms);
  s.codes.set(code, (s.codes.get(code) ?? 0) + 1);
  s.bytes += bytes;
  stats.set(path, s);
};

const deadline = Date.now() + seconds * 1000;
async function user(delay: number) {
  await new Promise((r) => setTimeout(r, delay));
  // Each virtual user has its own address so per-IP limits behave like real traffic.
  const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  while (Date.now() < deadline) {
    const path = pick();
    const t0 = performance.now();
    try {
      const res = await fetch(base + path, { headers: { "x-forwarded-for": ip, "user-agent": "ash-load-test" }, signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
      const body = await res.arrayBuffer();
      record(path, performance.now() - t0, String(res.status), body.byteLength);
    } catch (e) {
      record(path, performance.now() - t0, e instanceof Error && e.name === "TimeoutError" ? "timeout" : "error", 0);
    }
  }
}

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

console.log(`Load test: ${base} · ${users} users · ${seconds}s · ramp ${ramp}s`);
const started = performance.now();
await Promise.all(Array.from({ length: users }, (_, i) => user((i / users) * ramp * 1000)));
const elapsed = (performance.now() - started) / 1000;

let all: number[] = [];
let failures = 0;
const rows = [...stats.entries()]
  .sort((a, b) => b[1].times.length - a[1].times.length)
  .map(([path, s]) => {
    const sorted = [...s.times].sort((a, b) => a - b);
    all = all.concat(sorted);
    for (const [code, n] of s.codes) if (!/^[23]/.test(code) && !(path.includes("does-not-exist") && code === "404")) failures += n;
    return {
      route: path,
      requests: s.times.length,
      "p50 ms": Math.round(pct(sorted, 50)),
      "p95 ms": Math.round(pct(sorted, 95)),
      "p99 ms": Math.round(pct(sorted, 99)),
      "max ms": Math.round(sorted.at(-1) ?? 0),
      codes: [...s.codes].map(([c, n]) => `${c}×${n}`).join(" "),
    };
  });
console.table(rows);
all.sort((a, b) => a - b);
console.log(
  `Total ${all.length} requests in ${elapsed.toFixed(1)}s = ${(all.length / elapsed).toFixed(0)} req/s · p50 ${Math.round(pct(all, 50))} ms · p95 ${Math.round(pct(all, 95))} ms · p99 ${Math.round(pct(all, 99))} ms · unexpected responses ${failures} (${((failures / Math.max(1, all.length)) * 100).toFixed(2)}%)`,
);
process.exit(failures / Math.max(1, all.length) > 0.01 ? 1 : 0);
