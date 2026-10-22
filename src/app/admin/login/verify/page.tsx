import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/admin/auth-shell";
import { TotpEntry } from "@/components/admin/auth-entry";

export const metadata: Metadata = { title: "Two-factor authentication" };

export default function VerifyPage() {
  return (
    <AuthShell title="Two-step verification" lead="Enter the six-digit code from your authenticator app.">
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-muted" />}>
        <TotpEntry />
      </Suspense>
    </AuthShell>
  );
}
