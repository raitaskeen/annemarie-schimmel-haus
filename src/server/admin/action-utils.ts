import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError, type z } from "zod";
import { authorize, AuthError } from "@/lib/auth/dal";
import type { Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

/** Uniform result shape for admin Server Actions (consumed by useActionState). */
export type ActionState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string>; data?: Record<string, unknown> } | null;

export class ActionError extends Error {}

/**
 * Wraps an admin mutation: re-checks the session and permission, maps zod
 * errors to field errors and hides internal errors from the client.
 * Next.js redirects/notFound thrown inside are re-thrown untouched.
 */
export async function adminAction(permission: Permission, fn: (user: SessionUser) => Promise<ActionState>): Promise<ActionState> {
  try {
    const user = await authorize(permission);
    return await fn(user);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AuthError || error instanceof ActionError) return { error: error.message };
    if (error instanceof ZodError) return { error: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(error) };
    const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
    if ((e.code ?? e.cause?.code) === "23505") return { error: "This value is already used by another record (must be unique).", fieldErrors: guessUniqueField(e.constraint ?? e.cause?.constraint) };
    if ((e.code ?? e.cause?.code) === "23503") return { error: "This record is still referenced elsewhere and cannot be removed." };
    console.error("admin action failed", error);
    return { error: "Something went wrong. Nothing was changed." };
  }
}

export function zodFieldErrors(error: ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

function guessUniqueField(constraint?: string): Record<string, string> | undefined {
  if (!constraint) return undefined;
  if (constraint.includes("slug")) return { slug: "This URL slug is already taken." };
  if (constraint.includes("code")) return { code: "This code is already taken." };
  if (constraint.includes("email")) return { email: "This email address is already in use." };
  return undefined;
}

/* ------------------------------------------------------------ form parsing */

export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

export function parseForm<S extends z.ZodType>(schema: S, formData: FormData): z.output<S> {
  return schema.parse(formObject(formData));
}

/** "2026-11-06T17:00" entered in Lahore time → Date. Pakistan has no DST (UTC+5). */
export function fromPkt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const v = value.length === 16 ? `${value}:00` : value;
  const d = new Date(`${v}+05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "YYYY-MM-DDTHH:mm" in Lahore time for datetime-local inputs. */
export function toPktInput(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date.getTime() + 5 * 3600_000).toISOString().slice(0, 16);
}
