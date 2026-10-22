import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, LogOut, ShieldOff, Trash, Unlock } from "lucide-react";
import { HistoryList } from "@/components/admin/activity";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { ResendInvite, UserEditForm } from "@/components/admin/user-forms";
import { DefinitionList, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { roleLabels } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { deleteInvitedUserAction, resendInviteAction, resetUserTwoFactorAction, signOutUserAction, unlockUserAction, updateUserAction } from "@/server/actions/users";
import { getUserAdmin } from "@/server/admin/users";

export const metadata: Metadata = { title: "Staff account" };

export default async function UserPage(props: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin("users:manage");
  const { id } = await props.params;
  const data = await getUserAdmin(id);
  if (!data) notFound();
  const { u, activity, sessionCount, inviteExpiresAt } = data;
  const self = u.id === me.id;
  const locked = u.locked;

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Users & roles
      </Link>
      <PageHeader
        eyebrow={roleLabels[u.role]}
        title={u.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={u.status} /> {u.email}
          </span>
        }
        actions={
          <>
            {locked && (
              <ConfirmAction action={unlockUserAction.bind(null, u.id)} title="Unlock this account?" description="The account was locked after repeated failed sign-ins. Unlock only if you are sure it was the owner." confirmLabel="Unlock">
                <Unlock /> Unlock
              </ConfirmAction>
            )}
            {u.totpEnabledAt && !self && (
              <ConfirmAction action={resetUserTwoFactorAction.bind(null, u.id)} title="Remove two-factor authentication?" description="Use this when someone lost their phone. They are signed out and can set it up again." confirmLabel="Remove 2FA" destructive>
                <ShieldOff /> Reset 2FA
              </ConfirmAction>
            )}
            {sessionCount > 0 && (
              <ConfirmAction action={signOutUserAction.bind(null, u.id)} title="Sign out on all devices?" description={self ? "Your other devices are signed out; this one stays signed in." : "Use this if a device was lost or shared."} confirmLabel="Sign out everywhere">
                <LogOut /> Sign out everywhere
              </ConfirmAction>
            )}
            {u.status === "invited" && (
              <ConfirmAction action={deleteInvitedUserAction.bind(null, u.id)} title="Withdraw this invitation?" description="The account is removed and the link stops working." confirmLabel="Withdraw" destructive>
                <Trash /> Withdraw invitation
              </ConfirmAction>
            )}
          </>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-6">
          <Panel title="Account">
            <UserEditForm action={updateUserAction.bind(null, u.id)} user={u} self={self} />
          </Panel>
          {u.status === "invited" && (
            <Panel title="Invitation" description={inviteExpiresAt ? `Current link expires ${formatDateTime(inviteExpiresAt, "en")}` : "The invitation link has expired."}>
              <ResendInvite action={resendInviteAction.bind(null, u.id)} />
            </Panel>
          )}
          <Panel title="Recent activity">
            <HistoryList items={activity} />
          </Panel>
        </div>
        <Panel title="Security">
          <DefinitionList
            columns={1}
            items={[
              { label: "Two-factor authentication", value: u.totpEnabledAt ? `On since ${formatDateTime(u.totpEnabledAt, "en")}` : "Off" },
              { label: "Password", value: u.hasPassword ? (u.passwordChangedAt ? `Changed ${formatDateTime(u.passwordChangedAt, "en")}` : "Set") : "Not set yet" },
              { label: "Last sign-in", value: u.lastLoginAt ? formatDateTime(u.lastLoginAt, "en") : "Never" },
              { label: "Signed-in devices", value: sessionCount },
              { label: "Failed sign-ins in a row", value: u.failedLoginCount },
              { label: "Locked", value: locked ? `Until ${formatDateTime(u.lockedUntil!, "en")}` : "No" },
              { label: "Created", value: formatDateTime(u.createdAt, "en") },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
