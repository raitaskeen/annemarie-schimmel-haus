import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { Breadcrumbs, ThemeToggle, TopbarStart } from "@/components/admin/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/auth/dal";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { navCounts } from "@/server/admin/stats";

/**
 * Admin shell. The frame renders immediately; the session-dependent sidebar
 * streams in. Authorization is still enforced by every page and action via the
 * Data Access Layer — this layout only decides what to show.
 */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <SidebarProvider className="bg-sidebar">
      <Suspense fallback={<div className="hidden w-64 shrink-0 bg-sidebar md:block" />}>
        <SessionSidebar />
      </Suspense>
      <SidebarInset className="min-w-0 bg-background md:my-2 md:mr-2 md:rounded-2xl md:shadow-sm">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur md:rounded-t-2xl">
          <TopbarStart>
            <Suspense fallback={null}>
              <Breadcrumbs />
            </Suspense>
          </TopbarStart>
          <ThemeToggle />
        </header>
        <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

async function SessionSidebar() {
  const user = await getSessionUser();
  if (!user || user.mfaPending) redirect("/admin/login");
  if (!canAccessAdmin(user.role)) redirect("/admin/no-access");
  const counts = await navCounts();
  return <AppSidebar user={{ name: user.name, email: user.email, role: user.role, totpEnabled: user.totpEnabled }} counts={counts} />;
}
