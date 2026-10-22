"use client";

import { useState } from "react";
import { MonitorDown } from "lucide-react";
import { HowToDialog, type InstallLabels } from "@/components/pwa/install-ui";
import { useInstall } from "@/components/pwa/use-install";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const LABELS: InstallLabels = {
  install: "Install ASH Admin",
  installed: "ASH Admin is installed — open it from your desktop, dock or home screen.",
  open: "You are using the ASH Admin app",
  howTitle: "Install ASH Admin",
  ios: "On iPhone or iPad (Safari): tap Share, then “Add to Home Screen”.",
  iosOther: "On iPhone or iPad, open the admin in Safari, tap Share and choose “Add to Home Screen”.",
  mac: "On a Mac in Safari: File → “Add to Dock”.",
  android: "In Chrome: open the ⋮ menu and choose “Install app”.",
  desktop: "In Chrome or Edge: click the install icon at the right of the address bar, or ⋮ → “Install ASH Admin”.",
  firefox: "Firefox cannot install web apps on computers — use Chrome, Edge or Safari for the installed admin.",
  close: "Close",
};

/** Sidebar entry that installs the admin as its own app window (separate from the public site app). */
export function InstallAdminItem() {
  const install = useInstall();
  const [open, setOpen] = useState(false);
  if (!install.ready || install.standalone) return null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Install admin app"
        className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
        onClick={async () => {
          if (!(await install.prompt())) setOpen(true);
        }}
      >
        <MonitorDown className="size-4" /> <span>Install admin app</span>
      </SidebarMenuButton>
      <HowToDialog open={open} onOpenChange={setOpen} labels={LABELS} platform={install.platform} />
    </SidebarMenuItem>
  );
}
