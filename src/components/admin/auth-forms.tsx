"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { AlertCircle, CircleCheck, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { forgotPasswordAction, loginAction, setPasswordWithTokenAction, verifyTotpAction, type FormState } from "@/server/actions/auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Submits without React 19's automatic form reset, so a failed sign-in keeps the
 * email address. Without JavaScript the native form post still works.
 */
function useSubmitKeepingInput(action: (data: FormData) => void) {
  const [, start] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    start(() => action(data));
  };
}

function Alert({ state }: { state: FormState }) {
  if (!state?.error && !state?.message) return null;
  const ok = !!state.message && !state.error;
  return (
    <p role={ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-xl p-3 text-sm ${ok ? "bg-mist text-pine" : "bg-destructive/10 text-destructive"}`}>
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      {state.error ?? state.message}
    </p>
  );
}

function PasswordInput({ id, name, autoComplete }: { id: string; name: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} className="h-11 pr-11" maxLength={256} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(loginAction, notice ? { message: notice } : null);
  const onSubmit = useSubmitKeepingInput(action);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    // After a failed attempt clear only the password and put the cursor back there.
    const password = form.current?.elements.namedItem("password");
    if (state?.error && password instanceof HTMLInputElement) {
      password.value = "";
      password.focus();
    }
  }, [state]);
  return (
    <form ref={form} action={action} onSubmit={onSubmit} className="grid gap-5">
      <Alert state={state} />
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="username" inputMode="email" className="h-11" autoFocus />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/admin/forgot-password" className="text-xs font-medium text-pine hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>
      <Button type="submit" disabled={pending} className="h-11 bg-forest text-white hover:bg-pine">
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />} Sign in
      </Button>
    </form>
  );
}

export function TotpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(verifyTotpAction, null);
  const [code, setCode] = useState("");
  return (
    <form action={action} className="grid gap-5">
      <Alert state={state} />
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <input type="hidden" name="code" value={code} />
      <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus inputMode="numeric" pattern="^[0-9]*$" aria-label="Six-digit code">
        <InputOTPGroup className="w-full justify-between">
          {Array.from({ length: 6 }, (_, i) => (
            <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <Button type="submit" disabled={pending || code.length !== 6} className="h-11 bg-forest text-white hover:bg-pine">
        {pending && <Loader2 className="animate-spin" />} Verify
      </Button>
      <Link href="/admin/login" className="text-center text-xs text-muted-foreground hover:underline">
        Use a different account
      </Link>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  const onSubmit = useSubmitKeepingInput(action);
  return (
    <form action={action} onSubmit={onSubmit} className="grid gap-5">
      <Alert state={state} />
      <div className="grid gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required autoComplete="username" className="h-11" />
      </div>
      <Button type="submit" disabled={pending} className="h-11 bg-forest text-white hover:bg-pine">
        {pending && <Loader2 className="animate-spin" />} Send reset link
      </Button>
      <Link href="/admin/login" className="text-center text-xs text-muted-foreground hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

export function SetPasswordForm({ token, purpose }: { token: string; purpose: "invite" | "password_reset" }) {
  const [state, action, pending] = useActionState(setPasswordWithTokenAction, null);
  return (
    <form action={action} className="grid gap-5">
      <Alert state={state} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="purpose" value={purpose} />
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" />
        <p className={`text-xs ${state?.fieldErrors?.password ? "text-destructive" : "text-muted-foreground"}`}>
          {state?.fieldErrors?.password ?? "At least 12 characters, mixing upper and lower case, digits or symbols."}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Repeat password</Label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
      </div>
      <Button type="submit" disabled={pending} className="h-11 bg-forest text-white hover:bg-pine">
        {pending && <Loader2 className="animate-spin" />} {purpose === "invite" ? "Activate account" : "Save new password"}
      </Button>
    </form>
  );
}
