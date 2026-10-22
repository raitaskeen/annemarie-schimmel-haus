"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionState } from "./form";

/** A button that asks for confirmation before running a (usually destructive) Server Action. */
export function ConfirmAction({
  action,
  title,
  description,
  confirmLabel = "Confirm",
  children,
  variant = "outline",
  destructive,
  size = "sm",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  description: string;
  confirmLabel?: string;
  children: React.ReactNode;
  variant?: "outline" | "ghost" | "default" | "destructive";
  destructive?: boolean;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, data: FormData) => {
    const result = await action(prev, data);
    if (result?.ok) setOpen(false);
    return result;
  }, null);
  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.ok && state.message) toast.success(state.message);
  }, [state]);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className={destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
