"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  CalendarDays,
  ChevronsUpDown,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Handshake,
  Images,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Newspaper,
  ScrollText,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { can, roleLabels } from "@/lib/auth/permissions";
import type { UserRole } from "@/db/schema";
import type { NavCounts } from "@/server/admin/stats";
import { logoutAction } from "@/server/actions/auth";
import { InstallAdminItem } from "./install-admin";
import { NAV } from "./nav-config";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  enrollments: GraduationCap,
  placement: ClipboardCheck,
  messages: Inbox,
  courses: GraduationCap,
  events: CalendarDays,
  exams: Award,
  news: Newspaper,
  gallery: Images,
  partners: Handshake,
  subscribers: Mail,
  notifications: Bell,
  users: Users,
  audit: ScrollText,
  settings: Settings,
};

export function AppSidebar({ user, counts }: { user: { name: string; email: string; role: UserRole; totpEnabled: boolean }; counts: NavCounts }) {
  const pathname = usePathname() ?? "";
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pt-4">
        <Link href="/admin" className="flex items-center gap-3 overflow-hidden rounded-lg p-1.5 hover:bg-sidebar-accent">
          <Image src="/icons/admin-192.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg" />
          <span className="truncate font-display text-lg text-white group-data-[collapsible=icon]:hidden">Schimmel-Haus</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar">
        {NAV.map((group) => {
          const items = group.items.filter((i) => can(user.role, i.permission));
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[10px] tracking-[0.14em] text-sidebar-foreground/50 uppercase">{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  const badge = item.badge ? counts[item.badge] : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="h-9 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground"
                      >
                        <Link href={item.href}>
                          <Icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badge > 0 && (
                        <SidebarMenuBadge className={item.badgeTone === "alert" ? "bg-[#c0392b] text-white" : "bg-lime/90 text-forest"}>{badge > 99 ? "99+" : badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <SidebarMenu>
          <InstallAdminItem />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View website" className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white">
              <a href="/en" target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> <span>View website</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="text-white hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime text-xs font-bold text-forest">{initials}</span>
                  <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{roleLabels[user.role]}</span>
                  </span>
                  <ChevronsUpDown className="size-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/account">
                    <UserRound /> My account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/account#security">
                    <KeyRound /> {user.totpEnabled ? "Security" : "Enable two-factor"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut /> Sign out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
