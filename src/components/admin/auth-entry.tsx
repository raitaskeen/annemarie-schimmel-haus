"use client";

import { useSearchParams } from "next/navigation";
import { LoginForm, TotpForm } from "./auth-forms";

/** Reads ?next= and ?reset= on the client so the sign-in shell stays static. */
export function LoginEntry() {
  const params = useSearchParams();
  return <LoginForm next={params.get("next") ?? undefined} notice={params.get("reset") ? "Your password has been saved. Please sign in." : undefined} />;
}

export function TotpEntry() {
  return <TotpForm next={useSearchParams().get("next") ?? undefined} />;
}
