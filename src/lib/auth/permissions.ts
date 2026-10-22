import type { UserRole } from "@/db/schema";

/**
 * Role-based permissions. Teacher and student roles are reserved for the
 * upcoming portals and have no admin access yet.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "content:write",
  "submissions:read",
  "submissions:write",
  "submissions:export",
  "files:read",
  "messages:manage",
  "notifications:manage",
  "users:manage",
  "settings:manage",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<UserRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  editor: [
    "dashboard:view",
    "content:write",
    "submissions:read",
    "submissions:write",
    "submissions:export",
    "files:read",
    "messages:manage",
    "notifications:manage",
  ],
  support: ["dashboard:view", "submissions:read", "submissions:write", "files:read", "messages:manage"],
  teacher: [],
  student: [],
};

export function can(role: UserRole, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function canAccessAdmin(role: UserRole): boolean {
  return can(role, "dashboard:view");
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  editor: "Editor",
  support: "Course office",
  teacher: "Teacher",
  student: "Student",
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "Full access including users, settings and the audit log.",
  editor: "Edits courses, events, tests, news and gallery; manages submissions.",
  support: "Processes enrolments, registrations, placement tests and messages.",
  teacher: "Reserved for the upcoming teacher portal.",
  student: "Reserved for the upcoming student portal.",
};
