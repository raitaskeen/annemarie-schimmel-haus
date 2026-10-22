import Link from "next/link";
import type { Metadata } from "next";
import { Lock, ShieldCheck } from "lucide-react";
import { InviteUserDialog } from "@/components/admin/user-forms";
import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { roleDescriptions, roleLabels } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { inviteUserAction } from "@/server/actions/users";
import { listUsers } from "@/server/admin/users";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requireAdmin("users:manage");
  const rows = await listUsers();
  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Users & roles"
        description="Staff accounts are invitation-only. Each person sets their own password; administrators can require two-factor authentication by checking the shield column."
        actions={<InviteUserDialog action={inviteUserAction} />}
      />
      <Panel padded={false} className="mb-6">
        <DataTable>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>2FA</th>
              <th>Last sign-in</th>
              <th>Devices</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              return (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                      {u.name}
                      {u.id === me.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                    </Link>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="text-sm">{roleLabels[u.role]}</td>
                  <td>{u.totpEnabledAt ? <ShieldCheck className="size-4 text-primary" aria-label="On" /> : <span className="text-xs text-muted-foreground">off</span>}</td>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt, "en") : "never"}</td>
                  <td className="tabular">{u.activeSessions}</td>
                  <td>
                    <span className="flex items-center gap-1.5">
                      <StatusBadge status={u.status} label={u.status === "invited" && !u.pendingInvite ? "invite expired" : undefined} />
                      {u.locked && <Lock className="size-3.5 text-destructive" aria-label="Locked after failed sign-ins" />}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Panel>
      <Panel title="What each role can do">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {(Object.keys(roleLabels) as (keyof typeof roleLabels)[]).map((r) => (
            <div key={r} className="rounded-xl border p-4">
              <dt className="font-semibold">{roleLabels[r]}</dt>
              <dd className="mt-1 text-xs text-muted-foreground">{roleDescriptions[r]}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </>
  );
}
