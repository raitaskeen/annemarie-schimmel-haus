import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/admin/auth-shell";
import { LoginEntry } from "@/components/admin/auth-entry";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" lead="Sign in to the Annemarie-Schimmel-Haus staff workspace.">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
        <LoginEntry />
      </Suspense>
    </AuthShell>
  );
}
