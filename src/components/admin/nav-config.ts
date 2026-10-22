import type { Permission } from "@/lib/auth/permissions";
import type { NavCounts } from "@/server/admin/stats";

export type NavItem = { title: string; href: string; icon: string; permission: Permission; badge?: keyof NavCounts; badgeTone?: "lime" | "alert" };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { label: "Overview", items: [{ title: "Dashboard", href: "/admin", icon: "dashboard", permission: "dashboard:view" }] },
  {
    label: "Applications",
    items: [
      { title: "Enrollments", href: "/admin/enrollments", icon: "enrollments", permission: "submissions:read", badge: "enrollments", badgeTone: "lime" },
      { title: "Placement tests", href: "/admin/placement", icon: "placement", permission: "submissions:read", badge: "placement", badgeTone: "lime" },
      { title: "Messages", href: "/admin/messages", icon: "messages", permission: "messages:manage", badge: "messages", badgeTone: "lime" },
    ],
  },
  {
    label: "Programme",
    items: [
      { title: "Courses & batches", href: "/admin/courses", icon: "courses", permission: "content:write" },
      { title: "Events", href: "/admin/events", icon: "events", permission: "submissions:read" },
      { title: "Goethe exams", href: "/admin/exams", icon: "exams", permission: "content:write" },
    ],
  },
  {
    label: "Website",
    items: [
      { title: "News", href: "/admin/news", icon: "news", permission: "content:write" },
      { title: "Gallery", href: "/admin/gallery", icon: "gallery", permission: "content:write" },
      { title: "Partners", href: "/admin/partners", icon: "partners", permission: "content:write" },
      { title: "Subscribers", href: "/admin/subscribers", icon: "subscribers", permission: "submissions:export" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Notifications", href: "/admin/notifications", icon: "notifications", permission: "notifications:manage", badge: "notifications", badgeTone: "alert" },
      { title: "Users & roles", href: "/admin/users", icon: "users", permission: "users:manage" },
      { title: "Audit log", href: "/admin/audit", icon: "audit", permission: "audit:read" },
      { title: "Settings", href: "/admin/settings", icon: "settings", permission: "settings:manage" },
    ],
  },
];
