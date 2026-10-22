import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { can, canAccessAdmin, type Permission } from "./permissions";
import { readSession, type SessionUser } from "./session";

/**
 * Data Access Layer: every admin page, Server Action and Route Handler calls
 * one of these before touching data. Authorization is re-checked on every
 * request, never trusted from the client or a layout.
 */
export const getSessionUser = cache(readSession);

export async function requireAdmin(permission: Permission = "dashboard:view"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.mfaPending) redirect("/admin/login/verify");
  if (!canAccessAdmin(user.role) || !can(user.role, permission)) redirect("/admin/no-access");
  return user;
}

/** For Server Actions: returns the user or throws (no redirects mid-mutation). */
export async function authorize(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.mfaPending) throw new AuthError("Your session has expired. Please sign in again.");
  if (!can(user.role, permission)) throw new AuthError("You do not have permission to do that.");
  return user;
}

export class AuthError extends Error {
  readonly status = 403;
}
