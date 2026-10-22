import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { referencePattern } from "@/lib/validators";

/**
 * The tracker only issues a manage token after the application number, the phone
 * number and the bot quiz all matched. It is HMAC-signed, bound to one application
 * number and expires after 20 minutes, enough to cancel or report a payment.
 */
const TTL_MS = 20 * 60_000;
const sign = (body: string) => createHmac("sha256", env().AUTH_SECRET).update(`tracker-manage:${body}`).digest("base64url");

export function issueManageToken(reference: string) {
  const body = Buffer.from(JSON.stringify({ r: reference, exp: Date.now() + TTL_MS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyManageToken(token: unknown): string | null {
  if (typeof token !== "string" || token.length > 300) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const a = Buffer.from(sign(body));
  const b = Buffer.from(mac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { r, exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { r: string; exp: number };
    return typeof r === "string" && referencePattern.test(r) && exp > Date.now() ? r : null;
  } catch {
    return null;
  }
}
