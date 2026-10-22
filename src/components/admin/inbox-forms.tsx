"use client";

import { useState } from "react";
import { AdminForm, SubmitButton, type ActionState } from "./form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

/** Reply composer: sent as a branded email through the outbox. */
export function ReplyForm({ action, name, locale }: { action: Action; name: string; locale: string }) {
  const [close, setClose] = useState(false);
  return (
    <AdminForm action={action} resetOnSuccess className="grid gap-3">
      {(state) => (
        <>
          <Textarea
            name="body"
            rows={8}
            placeholder={locale === "de" ? `Antwort an ${name} (auf Deutsch) …` : `Your reply to ${name} …`}
            aria-label="Reply"
            aria-invalid={!!state?.fieldErrors?.body || undefined}
          />
          {state?.fieldErrors?.body && <p className="text-xs text-destructive">{state.fieldErrors.body}</p>}
          <p className="text-xs text-muted-foreground">The greeting, your name, the reference number and the ASH signature are added automatically.</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="hidden" name="close" value={close ? "true" : "false"} />
              <Switch checked={close} onCheckedChange={setClose} /> Close the conversation after sending
            </label>
            <SubmitButton icon={false}>Send reply</SubmitButton>
          </div>
        </>
      )}
    </AdminForm>
  );
}
