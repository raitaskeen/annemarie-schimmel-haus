import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Client address for rate limiting. Clients can send any X-Forwarded-For they
 * like and proxies append to it, so only the entries added by our own proxies
 * are trusted: the address TRUSTED_PROXY_HOPS positions from the right.
 * Behind Cloudflare set IP_SOURCE=cf-connecting-ip (and block non-Cloudflare traffic).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const { IP_SOURCE, TRUSTED_PROXY_HOPS } = env();
  if (IP_SOURCE !== "x-forwarded-for") {
    const direct = h.get(IP_SOURCE)?.trim();
    if (direct && direct.length <= 64) return direct;
  }
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ip = chain[Math.max(0, chain.length - TRUSTED_PROXY_HOPS)];
  return ip && ip.length <= 64 ? ip : "127.0.0.1";
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}

/** Keyed hash so raw IP addresses are never stored next to personal data. */
export function hashIp(ip: string): string {
  return createHmac("sha256", env().AUTH_SECRET).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export async function requestMeta() {
  const ip = await clientIp();
  return { ip, ipHash: hashIp(ip), userAgent: await userAgent() };
}
