import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { env } from "@/lib/env";

/**
 * Human check ("bot quiz") for public forms.
 *
 * The server issues a small arithmetic question with an HMAC-signed token.
 * A valid answer must:
 *  - match the signed question,
 *  - arrive at least MIN_SECONDS after the question was issued (bots submit instantly),
 *  - arrive before the token expires,
 *  - be used only once (nonce recorded in Postgres).
 * Combined with a honeypot field and per-IP rate limits this stops automated
 * submissions without third-party scripts or tracking.
 */
const TTL_SECONDS = 20 * 60;
const MIN_SECONDS = 3;

export type Challenge = { a: number; b: number; op: "+" | "−" | "×"; token: string };

type Payload = { a: number; b: number; op: Challenge["op"]; iat: number; n: string };

const sign = (data: string) => createHmac("sha256", env().AUTH_SECRET).update(`human-check:${data}`).digest("base64url");

export function createChallenge(): Challenge {
  const ops = ["+", "−", "×"] as const;
  const op = ops[randomInt(ops.length)];
  let a: number;
  let b: number;
  if (op === "×") {
    a = randomInt(2, 10);
    b = randomInt(2, 10);
  } else if (op === "−") {
    a = randomInt(10, 30);
    b = randomInt(1, 10);
  } else {
    a = randomInt(3, 20);
    b = randomInt(2, 15);
  }
  const payload: Payload = { a, b, op, iat: Math.floor(Date.now() / 1000), n: randomBytes(9).toString("base64url") };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { a, b, op, token: `${body}.${sign(body)}` };
}

function answerOf(p: Payload) {
  return p.op === "+" ? p.a + p.b : p.op === "−" ? p.a - p.b : p.a * p.b;
}

export type HumanCheckResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "too_fast" | "wrong" | "replayed" };

export async function verifyChallenge(token: unknown, answer: unknown): Promise<HumanCheckResult> {
  if (typeof token !== "string" || token.length > 400) return { ok: false, reason: "invalid" };
  const [body, mac] = token.split(".");
  if (!body || !mac) return { ok: false, reason: "invalid" };
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "invalid" };

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const age = Math.floor(Date.now() / 1000) - payload.iat;
  if (age > TTL_SECONDS) return { ok: false, reason: "expired" };
  if (age < MIN_SECONDS) return { ok: false, reason: "too_fast" };

  const numeric = Number(String(answer ?? "").trim());
  if (!Number.isInteger(numeric) || numeric !== answerOf(payload)) return { ok: false, reason: "wrong" };

  // Single use: remember the nonce until the token would have expired anyway.
  const inserted = await db().execute(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${`hc:${payload.n}`}, now(), 1)
    ON CONFLICT (key) DO NOTHING
    RETURNING key`);
  if (inserted.rows.length === 0) return { ok: false, reason: "replayed" };
  return { ok: true };
}
