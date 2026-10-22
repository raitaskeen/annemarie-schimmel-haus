import type { Metadata } from "next";
import { AuthShell } from "@/components/admin/auth-shell";
import { ForgotForm } from "@/components/admin/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" lead="We'll email you a single-use link that expires in 30 minutes.">
      <ForgotForm />
    </AuthShell>
  );
}
