"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AdminForm, SubmitButton, type ActionState } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type StatusOption = { status: string; label: string; description: string; tone?: "primary" | "danger" | "default"; askPaymentRef?: boolean; paymentRefDefault?: string | null };

/**
 * One button per allowed transition. Each opens a small confirmation dialog
 * with an optional internal note and a "notify applicant" switch.
 */
export function StatusActions({ options, action, notifyLabel = "Notify the applicant by email / WhatsApp" }: { options: StatusOption[]; action: (state: ActionState, formData: FormData) => Promise<ActionState>; notifyLabel?: string }) {
  if (!options.length) return <p className="text-sm text-muted-foreground">No further steps for this status.</p>;
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <StatusDialog key={o.status} option={o} action={action} notifyLabel={notifyLabel} />
      ))}
    </div>
  );
}

function StatusDialog({ option, action, notifyLabel }: { option: StatusOption; action: (state: ActionState, formData: FormData) => Promise<ActionState>; notifyLabel: string }) {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={option.tone === "danger" ? "outline" : option.tone === "primary" ? "default" : "outline"}
          className={
            option.tone === "primary"
              ? "justify-between bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground"
              : option.tone === "danger"
                ? "justify-between text-destructive hover:bg-destructive/10 hover:text-destructive"
                : "justify-between"
          }
        >
          {option.label} <ArrowRight />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <AdminForm action={action} onSuccess={() => setOpen(false)} className="grid gap-4">
          {() => (
            <>
              <DialogHeader>
                <DialogTitle>{option.label}</DialogTitle>
                <DialogDescription>{option.description}</DialogDescription>
              </DialogHeader>
              <input type="hidden" name="status" value={option.status} />
              {option.askPaymentRef && (
                <div className="grid gap-1.5">
                  <Label htmlFor="paymentRef">Payment reference</Label>
                  <Input id="paymentRef" name="paymentRef" defaultValue={option.paymentRefDefault ?? ""} placeholder="Bank / wallet transaction ID" />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="note">Internal note (optional)</Label>
                <Textarea id="note" name="note" rows={3} placeholder="Visible to staff only" />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                {notifyLabel}
                <input type="hidden" name="notify" value={notify ? "true" : "false"} />
                <Switch checked={notify} onCheckedChange={setNotify} />
              </label>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton variant={option.tone === "danger" ? "destructive" : undefined}>Confirm</SubmitButton>
              </DialogFooter>
            </>
          )}
        </AdminForm>
      </DialogContent>
    </Dialog>
  );
}
