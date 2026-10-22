"use client";

import { createContext, use, useActionState, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, Pencil, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Admin form toolkit. Forms post to Server Actions (works without JS);
 * results surface as toasts and inline field errors.
 */
export type ActionState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string>; data?: Record<string, unknown> } | null;
type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function AdminForm({
  action,
  children,
  className,
  onSuccess,
  resetOnSuccess,
  refresh = true,
  id,
}: {
  id?: string;
  action: Action;
  children: (state: ActionState) => ReactNode;
  className?: string;
  onSuccess?: (state: ActionState) => void;
  resetOnSuccess?: boolean;
  refresh?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.error) toast.error(state.error);
    if (state.ok) {
      if (state.message) toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (refresh) router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <PendingContext value={pending}>
      <form
        id={id}
        ref={ref}
        action={formAction}
        // With JavaScript we submit manually: React would otherwise reset every
        // uncontrolled field after the action, wiping input when validation fails.
        // Without JavaScript the native form post to the Server Action still works.
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return; // ignore double submits
          const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => formAction(data));
        }}
        className={className}
        noValidate
        aria-busy={pending || undefined}
      >
        {children(state)}
      </form>
    </PendingContext>
  );
}

const PendingContext = createContext(false);

export function SubmitButton({ children = "Save changes", className, variant, size, icon = true }: { children?: ReactNode; className?: string; variant?: "default" | "outline" | "destructive" | "secondary" | "ghost"; size?: "default" | "sm" | "lg"; icon?: boolean }) {
  const status = useFormStatus();
  const pending = use(PendingContext) || status.pending;
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={cn(variant === undefined && "bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground", className)}>
      {pending ? <Loader2 className="animate-spin" /> : icon ? <Save /> : null}
      {children}
    </Button>
  );
}

export function Field({
  label,
  name,
  hint,
  error,
  className,
  children,
  required,
}: {
  label: string;
  name?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children?: (id: string) => ReactNode;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children?.(id)}
      {error ? (
        <p className="text-xs text-destructive" role="alert" data-field={name}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({ label, name, defaultValue, state, hint, type = "text", required, className, ...rest }: { label: string; name: string; defaultValue?: string | number | null; state: ActionState; hint?: ReactNode; type?: string; required?: boolean; className?: string } & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue" | "type">) {
  const error = state?.fieldErrors?.[name];
  return (
    <Field label={label} name={name} hint={hint} error={error} className={className} required={required}>
      {(id) => <Input id={id} name={name} type={type} {...("value" in rest ? {} : { defaultValue: defaultValue ?? "" })} aria-invalid={!!error || undefined} required={required} {...rest} />}
    </Field>
  );
}

export function TextAreaField({ label, name, defaultValue, state, hint, rows = 4, className }: { label: string; name: string; defaultValue?: string | null; state: ActionState; hint?: ReactNode; rows?: number; className?: string }) {
  const error = state?.fieldErrors?.[name];
  return (
    <Field label={label} name={name} hint={hint} error={error} className={className}>
      {(id) => <Textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} aria-invalid={!!error || undefined} />}
    </Field>
  );
}

export function SelectField({ label, name, defaultValue, options, state, hint, className, required }: { label: string; name: string; defaultValue?: string | null; options: { value: string; label: string }[]; state: ActionState; hint?: ReactNode; className?: string; required?: boolean }) {
  const error = state?.fieldErrors?.[name];
  return (
    <Field label={label} name={name} hint={hint} error={error} className={className} required={required}>
      {(id) => (
        <select
          id={id}
          name={name}
          defaultValue={defaultValue ?? ""}
          aria-invalid={!!error || undefined}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-invalid:border-destructive"
        >
          {!required && <option value="">·</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function SwitchField({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: ReactNode }) {
  const [checked, setChecked] = useState(!!defaultChecked);
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Switch id={id} checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

/** English + German side by side (German optional, falls back to English on the site). */
export function BilingualField({
  label,
  name,
  values,
  state,
  multiline,
  markdown,
  rows = 4,
  required,
  hint,
}: {
  label: string;
  name: string;
  values: { en?: string | null; de?: string | null };
  state: ActionState;
  multiline?: boolean;
  markdown?: boolean;
  rows?: number;
  required?: boolean;
  hint?: string;
}) {
  const errEn = state?.fieldErrors?.[`${name}En`];
  const errDe = state?.fieldErrors?.[`${name}De`];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-xs font-semibold">
        {label}
        {required && <span className="text-destructive">*</span>}
      </legend>
      <div className="grid gap-3 lg:grid-cols-2">
        {(["En", "De"] as const).map((suffix) => {
          const value = suffix === "En" ? values.en : values.de;
          const error = suffix === "En" ? errEn : errDe;
          const flag = suffix === "En" ? "EN" : "DE";
          return (
            <div key={suffix} className="grid gap-1">
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                {flag} {suffix === "De" && <span className="font-normal normal-case">· optional, falls back to English</span>}
              </span>
              {markdown ? (
                <MarkdownInput name={`${name}${suffix}`} defaultValue={value ?? ""} rows={rows} invalid={!!error} />
              ) : multiline ? (
                <Textarea name={`${name}${suffix}`} rows={rows} defaultValue={value ?? ""} aria-invalid={!!error || undefined} aria-label={`${label} (${flag})`} />
              ) : (
                <Input name={`${name}${suffix}`} defaultValue={value ?? ""} aria-invalid={!!error || undefined} aria-label={`${label} (${flag})`} />
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

export function MarkdownInput({ name, defaultValue, rows = 8, invalid }: { name: string; defaultValue: string; rows?: number; invalid?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-2 py-1">
        <span className="text-[10px] text-muted-foreground">Markdown · **bold**, *italic*, - lists, [link](https://…)</span>
        <button type="button" onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium hover:bg-muted">
          {preview ? <Pencil className="size-3" /> : <Eye className="size-3" />} {preview ? "Edit" : "Preview"}
        </button>
      </div>
      <input type="hidden" name={name} value={value} />
      {preview ? (
        <div className="prose-ash max-h-96 min-h-32 overflow-auto p-3 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
            {value || "_Nothing to preview_"}
          </ReactMarkdown>
        </div>
      ) : (
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={rows} aria-invalid={invalid || undefined} className="rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0" />
      )}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-b pb-8 last:border-0 last:pb-0 lg:grid-cols-[240px_1fr]">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
