"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const LABELS: Record<string, string> = {
  admin: "Dashboard",
  enrollments: "Enrollments",
  placement: "Placement tests",
  messages: "Messages",
  courses: "Courses",
  offerings: "Batches",
  events: "Events",
  registrations: "Registrations",
  exams: "Goethe exams",
  news: "News",
  gallery: "Gallery",
  partners: "Partners",
  subscribers: "Subscribers",
  notifications: "Notifications",
  users: "Users & roles",
  audit: "Audit log",
  settings: "Settings",
  account: "My account",
  new: "New",
};

export function Breadcrumbs() {
  const pathname = usePathname() ?? "/admin";
  const parts = pathname.split("/").filter(Boolean);
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {parts.map((part, i) => {
          const url = `/${parts.slice(0, i + 1).join("/")}`;
          const label = LABELS[part] ?? (/^[0-9a-f-]{36}$/.test(part) ? "Details" : decodeURIComponent(part));
          const last = i === parts.length - 1;
          return (
            <Fragment key={url}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>{last ? <BreadcrumbPage>{label}</BreadcrumbPage> : <BreadcrumbLink asChild><Link href={url}>{label}</Link></BreadcrumbLink>}</BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser; render the neutral icon during SSR and hydration.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export function TopbarStart({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      {children}
    </div>
  );
}
