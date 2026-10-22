"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { AdminForm, SelectField, SubmitButton, TextField, type ActionState } from "./form";
import { QrCode } from "@/components/forms/qr-code";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

const ROLE_OPTIONS = [
  { value: "support", label: "Course office, processes applications and messages" },
  { value: "editor", label: "Editor, also edits courses, events and website content" },
  { value: "admin", label: "Administrator, full access incl. users and settings" },
];

/** Shows a one-time invite link with a copy button. */
export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-xl border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">Invitation link (valid 72 hours, works once). It was also emailed, share it yourself if email is not connected yet.</p>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function InviteUserDialog({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setLink(null);
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
          <UserPlus /> Invite staff member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a staff member</DialogTitle>
          <DialogDescription>They receive a link to set their own password. Nobody, not even administrators, ever sees it.</DialogDescription>
        </DialogHeader>
        {link ? (
          <>
            <InviteLink url={link} />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <AdminForm action={action} onSuccess={(s) => setLink(String(s?.data?.inviteUrl ?? ""))} className="grid gap-4">
            {(state) => (
              <>
                <TextField label="Full name" name="name" state={state} required autoComplete="off" />
                <TextField label="Work email" name="email" type="email" state={state} required autoComplete="off" />
                <SelectField label="Role" name="role" defaultValue="support" options={ROLE_OPTIONS} state={state} required />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <SubmitButton icon={false}>Send invitation</SubmitButton>
                </DialogFooter>
              </>
            )}
          </AdminForm>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function UserEditForm({ action, user, self }: { action: Action; user: { name: string; role: string; status: string }; self: boolean }) {
  return (
    <AdminForm action={action} className="grid gap-4">
      {(state) => (
        <>
          <TextField label="Name" name="name" defaultValue={user.name} state={state} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Role"
              name="role"
              defaultValue={user.role}
              state={state}
              required
              hint={self ? "You cannot change your own role." : "Changing the role signs the person out everywhere."}
              options={[
                { value: "support", label: "Course office" },
                { value: "editor", label: "Editor" },
                { value: "admin", label: "Administrator" },
                { value: "teacher", label: "Teacher (portal coming soon)" },
                { value: "student", label: "Student (portal coming soon)" },
              ]}
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue={user.status}
              state={state}
              required
              hint={self ? "You cannot disable yourself." : "Disabled accounts cannot sign in; history is kept."}
              options={[
                { value: "active", label: "Active" },
                { value: "invited", label: "Invited" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton>Save</SubmitButton>
          </div>
        </>
      )}
    </AdminForm>
  );
}

/** Admin-side action that may hand back a fresh invite link. */
export function ResendInvite({ action }: { action: Action }) {
  const [link, setLink] = useState<string | null>(null);
  return link ? (
    <InviteLink url={link} />
  ) : (
    <AdminForm action={action} onSuccess={(s) => setLink(String(s?.data?.inviteUrl ?? ""))}>
      {() => (
        <SubmitButton variant="outline" icon={false}>
          Create a new invitation link
        </SubmitButton>
      )}
    </AdminForm>
  );
}

/* ----------------------------------------------------------------- account */

export function ProfileForm({ action, name, email }: { action: Action; name: string; email: string }) {
  return (
    <AdminForm action={action} className="grid gap-4">
      {(state) => (
        <>
          <TextField label="Name" name="name" defaultValue={name} state={state} required autoComplete="name" />
          <TextField label="Email" name="email-display" defaultValue={email} state={state} disabled hint="Ask an administrator to change your sign-in email." />
          <div className="flex justify-end">
            <SubmitButton size="sm">Save profile</SubmitButton>
          </div>
        </>
      )}
    </AdminForm>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  return (
    <AdminForm action={action} resetOnSuccess className="grid gap-4">
      {(state) => (
        <>
          <TextField label="Current password" name="current" type="password" state={state} required autoComplete="current-password" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="New password" name="password" type="password" state={state} required autoComplete="new-password" hint="At least 12 characters. A short sentence works well." />
            <TextField label="Repeat new password" name="confirm" type="password" state={state} required autoComplete="new-password" />
          </div>
          <div className="flex justify-end">
            <SubmitButton size="sm" icon={false}>
              <KeyRound /> Change password
            </SubmitButton>
          </div>
        </>
      )}
    </AdminForm>
  );
}

export function TwoFactorSetup({ begin, confirm, disable, enabled }: { begin: () => Promise<ActionState>; confirm: Action; disable: Action; enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; qr: boolean[][] } | null>(null);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (enabled) {
    return (
      <div className="grid gap-4">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <ShieldCheck className="size-5" /> Two-factor authentication is on.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="justify-self-start text-destructive hover:text-destructive">
              Turn off
            </Button>
          </DialogTrigger>
          <DialogContent>
            <AdminForm action={disable} className="grid gap-4">
              {(state) => (
                <>
                  <DialogHeader>
                    <DialogTitle>Turn off two-factor authentication?</DialogTitle>
                    <DialogDescription>Your account will only be protected by your password. Confirm with your password and a current code.</DialogDescription>
                  </DialogHeader>
                  <TextField label="Password" name="password" type="password" state={state} required autoComplete="current-password" />
                  <TextField label="Code from your app" name="code" inputMode="numeric" state={state} required autoComplete="one-time-code" />
                  <DialogFooter>
                    <SubmitButton variant="destructive" icon={false}>
                      Turn off
                    </SubmitButton>
                  </DialogFooter>
                </>
              )}
            </AdminForm>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">Protect your account with a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password …). Strongly recommended for administrators.</p>
        <Button
          className="justify-self-start bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await begin();
              if (res?.error) toast.error(res.error);
              else setSetup(res?.data as { secret: string; qr: boolean[][] });
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Set up two-factor authentication
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
      <QrCode matrix={setup.qr} label="QR code for your authenticator app" className="size-44 rounded-xl border bg-white p-1" />
      <AdminForm
        action={confirm}
        onSuccess={() => {
          setSetup(null);
          router.refresh();
        }}
        className="grid content-start gap-4"
      >
        {(state) => (
          <>
            <ol className="grid list-decimal gap-1 pl-5 text-sm">
              <li>Scan the QR code with your authenticator app.</li>
              <li>
                Or enter this key: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
              </li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
            <div className="grid gap-1.5">
              <Label>Code</Label>
              <input type="hidden" name="code" value={code} />
              <InputOTP maxLength={6} value={code} onChange={setCode} inputMode="numeric" aria-label="Six-digit code">
                <InputOTPGroup>
                  {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {state?.fieldErrors?.code && <p className="text-xs text-destructive">{state.fieldErrors.code}</p>}
            </div>
            <div className="flex gap-2">
              <SubmitButton icon={false}>Turn on</SubmitButton>
              <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </AdminForm>
    </div>
  );
}
