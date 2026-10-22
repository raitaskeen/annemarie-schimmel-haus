import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/admin/auth-shell";
import { SetPasswordForm } from "@/components/admin/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function Page(props: PageProps<"/admin/reset-password/[token]">) {
  return (
    <AuthShell title="Choose a new password" lead="Pick a password you don't use anywhere else.">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
        {props.params.then(({ token }) => (
          <SetPasswordForm token={token} purpose="password_reset" />
        ))}
      </Suspense>
    </AuthShell>
  );
}
