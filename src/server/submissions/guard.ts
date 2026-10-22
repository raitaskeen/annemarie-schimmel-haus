import "server-only";
import type { z } from "zod";
import { verifyChallenge } from "@/lib/security/human-check";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestMeta } from "@/lib/security/request";

export type SubmissionError =
  | "validation"
  | "human"
  | "rate_limited"
  | "closed"
  | "duplicate"
  | "not_found"
  | "files"
  | "generic";

export type SubmitResult =
  | { ok: true; reference: string; status: string; duplicate?: boolean }
  | { ok: false; error: SubmissionError; fieldErrors?: Record<string, string>; message?: string };

/** Flattens zod issues to { field: errorKey } (first issue per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Shared abuse protection for public submissions:
 * honeypot → per-IP rate limit → signed single-use human check.
 */
export async function guard(
  bucket: string,
  input: { website?: string; humanToken?: string; humanAnswer?: string },
  { limit = 8, windowSeconds = 600 }: { limit?: number; windowSeconds?: number } = {},
): Promise<{ ok: true; ipHash: string; userAgent: string } | { ok: false; error: SubmissionError }> {
  if (input.website) return { ok: false, error: "human" };
  const meta = await requestMeta();
  const rl = await rateLimit(bucket, meta.ipHash, { limit, windowSeconds });
  if (!rl.ok) return { ok: false, error: "rate_limited" };
  const human = await verifyChallenge(input.humanToken, input.humanAnswer);
  if (!human.ok) return { ok: false, error: "human" };
  return { ok: true, ipHash: meta.ipHash, userAgent: meta.userAgent };
}

/** Postgres unique-violation detection (constraint name aware). */
export function uniqueViolation(error: unknown, constraint?: string | RegExp): boolean {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const code = e?.code ?? e?.cause?.code;
  const name = e?.constraint ?? e?.cause?.constraint;
  return code === "23505" && (!constraint || (typeof constraint === "string" ? name === constraint : constraint.test(name ?? "")));
}
