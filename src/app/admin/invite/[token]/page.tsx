import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/admin/auth-shell";
import { SetPasswordForm } from "@/components/admin/auth-forms";

export const metadata: Metadata = { title: "Activate your account" };

export default function Page(props: PageProps<"/admin/invite/[token]">) {
  return (
    <AuthShell title="Activate your account" lead="Set a strong password to finish setting up your staff account.">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
        {props.params.then(({ token }) => (
          <SetPasswordForm token={token} purpose="invite" />
        ))}
      </Suspense>
    </AuthShell>
  );
}
