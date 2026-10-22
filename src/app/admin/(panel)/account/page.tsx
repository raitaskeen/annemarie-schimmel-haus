import type { Metadata } from "next";
import { LogOut, Monitor, Smartphone } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PasswordForm, ProfileForm, TwoFactorSetup } from "@/components/admin/user-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { roleLabels } from "@/lib/auth/permissions";
import { listSessions } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import {
  beginTwoFactorAction,
  changePasswordAction,
  confirmTwoFactorAction,
  disableTwoFactorAction,
  revokeMySessionAction,
  revokeOtherSessionsAction,
  updateProfileAction,
} from "@/server/actions/account";

export const metadata: Metadata = { title: "My account" };

/** Very small UA summary — enough to recognise a device, nothing more. */
function device(ua: string | null) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return { label: `${browser}${os ? ` on ${os}` : ""}`, mobile };
}

export default async function AccountPage() {
  const user = await requireAdmin("dashboard:view");
  const sessions = await listSessions(user.id);
  return (
    <>
      <PageHeader eyebrow={roleLabels[user.role]} title="My account" description={user.email} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="grid gap-6">
          <Panel title="Profile">
            <ProfileForm action={updateProfileAction} name={user.name} email={user.email} />
          </Panel>
          <Panel title="Password" description="Changing it signs you out on all other devices.">
            <PasswordForm action={changePasswordAction} />
          </Panel>
        </div>
        <div className="grid gap-6">
          <Panel title="Two-factor authentication" className="scroll-mt-20">
            <div id="security">
              <TwoFactorSetup begin={beginTwoFactorAction} confirm={confirmTwoFactorAction} disable={disableTwoFactorAction} enabled={user.totpEnabled} />
            </div>
          </Panel>
          <Panel
            title="Signed-in devices"
            actions={
              sessions.length > 1 && (
                <ConfirmAction action={revokeOtherSessionsAction} title="Sign out all other devices?" description="This device stays signed in." confirmLabel="Sign out others">
                  <LogOut /> Sign out others
                </ConfirmAction>
              )
            }
          >
            <ul className="grid gap-3">
              {sessions.map((s) => {
                const d = device(s.userAgent);
                const current = s.id === user.sessionId;
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">{d.mobile ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {d.label} {current && <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">this device</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.ip ?? "unknown network"} · active {formatDateTime(s.lastSeenAt, "en")}
                      </p>
                    </div>
                    {!current && (
                      <ConfirmAction action={revokeMySessionAction.bind(null, s.id)} title="Sign out this device?" description={d.label} confirmLabel="Sign out" variant="ghost">
                        <LogOut className="size-4" />
                      </ConfirmAction>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
