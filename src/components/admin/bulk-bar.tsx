"use client";

import { useEffect, useState } from "react";
import { SquareCheck, X } from "lucide-react";
import { AdminForm, SubmitButton, type ActionState } from "./form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Option = { value: string; label: string; danger?: boolean };

/**
 * Bulk actions for server-rendered tables. Row checkboxes are plain inputs with
 * form={formId}, so the table itself stays a server component; this bar counts
 * them, offers "select all" and posts the selection to a Server Action.
 */
export function BulkBar({ formId, action, options, noun, notifyLabel = "Notify by email / WhatsApp" }: { formId: string; action: (s: ActionState, f: FormData) => Promise<ActionState>; options: Option[]; noun: string; notifyLabel?: string }) {
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState(options[0]?.value ?? "");
  const [notify, setNotify] = useState(true);
  const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"][name="ids"]`)];

  useEffect(() => {
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.getAttribute?.("form") === formId) setSelected(boxes().filter((b) => b.checked).length);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const setAll = (checked: boolean) => {
    boxes().forEach((b) => (b.checked = checked));
    setSelected(checked ? boxes().length : 0);
  };
  const danger = options.find((o) => o.value === status)?.danger;

  return (
    <AdminForm
      id={formId}
      action={action}
      onSuccess={() => setAll(false)}
      className={selected ? "sticky bottom-3 z-20 mt-3" : "mt-3"}
    >
      {() => (
        <div className={selected ? "flex flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-2 pl-3 shadow-lg backdrop-blur" : "flex items-center gap-2 px-1"}>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAll(selected === 0)} className="h-8 gap-1.5 px-2 text-xs">
            {selected ? <X className="size-3.5" /> : <SquareCheck className="size-3.5" />}
            {selected ? `${selected} ${noun} selected` : `Select all ${noun} on this page`}
          </Button>
          {selected > 0 && (
            <>
              <label className="sr-only" htmlFor={`${formId}-status`}>
                New status
              </label>
              <select id={`${formId}-status`} name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm">
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <input type="hidden" name="notify" value={notify ? "true" : "false"} />
                <Switch checked={notify} onCheckedChange={setNotify} aria-label={notifyLabel} /> {notifyLabel}
              </label>
              <SubmitButton size="sm" icon={false} variant={danger ? "destructive" : undefined} className="ml-auto">
                Apply to {selected}
              </SubmitButton>
            </>
          )}
        </div>
      )}
    </AdminForm>
  );
}

/** Row checkbox that belongs to the bulk form (rendered by server components). */
export function RowCheck({ formId, value, label }: { formId: string; value: string; label: string }) {
  return <input type="checkbox" name="ids" value={value} form={formId} aria-label={label} className="size-4 cursor-pointer accent-[var(--color-ash)]" />;
}
