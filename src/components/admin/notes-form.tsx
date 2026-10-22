"use client";

import { AdminForm, SubmitButton, type ActionState } from "@/components/admin/form";
import { Textarea } from "@/components/ui/textarea";

export function NotesForm({ action, defaultValue }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; defaultValue: string }) {
  return (
    <AdminForm action={action} className="grid gap-3" refresh={false}>
      {() => (
        <>
          <Textarea name="notes" rows={5} defaultValue={defaultValue} placeholder="Internal notes — never shown to the applicant" aria-label="Staff notes" />
          <div className="flex justify-end">
            <SubmitButton size="sm">Save notes</SubmitButton>
          </div>
        </>
      )}
    </AdminForm>
  );
}
