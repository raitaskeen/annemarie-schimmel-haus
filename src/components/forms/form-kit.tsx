"use client";

import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Public form primitives: generous 48px touch targets, visible labels,
 * programmatic error association (aria-invalid / aria-describedby) and
 * hints that never rely on placeholder text alone.
 */
export function FormRow({
  label,
  hint,
  error,
  required,
  optionalLabel,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-semibold text-forest">
        <span>
          {label}
          {required && <span className="ml-0.5 text-ash" aria-hidden>*</span>}
        </span>
        {!required && optionalLabel && <span className="text-xs font-normal text-stone">{optionalLabel}</span>}
      </label>
      {children({ id, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-stone">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const fieldBase =
  "w-full rounded-xl border border-input bg-white/80 px-4 text-[15px] text-ink shadow-[inset_0_1px_2px_rgb(16_36_28/0.04)] transition-[border-color,box-shadow,background-color] placeholder:text-stone/60 hover:border-ash/50 focus:border-ash focus:bg-white focus:outline-none focus:ring-4 focus:ring-ash/15 aria-invalid:border-destructive aria-invalid:ring-destructive/10 disabled:cursor-not-allowed disabled:opacity-60";

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-32 py-3 leading-relaxed", className)} {...props} />;
});

export const SelectInput = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function SelectInput({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-stone">
        <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
      </svg>
    </div>
  );
});

/** Large selectable cards (radio semantics) for choices that deserve context. */
export function ChoiceCards<T extends string>({
  name,
  value,
  onChange,
  options,
  columns = 2,
  invalid,
  describedBy,
}: {
  name: string;
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; description?: ReactNode; disabled?: boolean; badge?: ReactNode }[];
  columns?: 1 | 2 | 3;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}
    >
      {options.map((o) => {
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "relative flex cursor-pointer items-start gap-3 rounded-2xl border bg-white/70 p-4 transition-all has-focus-visible:ring-4 has-focus-visible:ring-ash/20",
              checked ? "border-ash bg-mist shadow-[0_10px_30px_-18px_rgb(16_36_28/0.6)]" : "border-input hover:border-ash/50",
              o.disabled && "cursor-not-allowed opacity-50",
              invalid && !checked && "border-destructive/50",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors", checked ? "border-ash bg-ash text-white" : "border-ink/25")}>
              {checked && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-sm font-semibold text-forest">{o.label}</span>
              {o.description && <span className="text-xs leading-relaxed text-stone">{o.description}</span>}
            </span>
            {o.badge && <span className="ml-auto shrink-0">{o.badge}</span>}
          </label>
        );
      })}
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
  error,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  error?: string;
  id?: string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-white/60 p-4 text-sm leading-relaxed text-ink/85 transition-colors", checked ? "border-ash/60 bg-mist/70" : "border-input hover:border-ash/40", error && "border-destructive/60")}>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="peer sr-only"
        />
        <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-ash/25", checked ? "border-ash bg-ash text-white" : "border-ink/25 bg-white")}>
          {checked && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Invisible honeypot field (bots fill it; people never see it). */
export function Honeypot({ register }: { register: ComponentProps<"input"> }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" {...register} />
      </label>
    </div>
  );
}

export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-2xl p-4 text-sm", tone === "error" ? "bg-[#fdecea] text-[#8a1c12]" : "bg-mist text-pine")}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/**
 * After a failed submit, scrolls the first invalid field (or the error alert) into the
 * middle of the screen and focuses it, so nobody is left wondering why nothing happened.
 * Runs after React has rendered the error state.
 */
export function revealFirstError(form: HTMLFormElement | null) {
  setTimeout(() => {
    const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]:not([tabindex="-1"]), [role="alert"]');
    if (!el) return;
    bringIntoView(el, "center");
    if (el.matches("input, textarea, select, button")) el.focus({ preventScroll: true });
  }, 60);
}

/**
 * Smooth-scrolls an element into view, then makes sure it really arrived: some browsers,
 * embedded web views and battery savers skip smooth scrolling, so fall back to a jump.
 */
export function bringIntoView(el: HTMLElement, block: ScrollLogicalPosition = "start") {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block, behavior: reduce ? "auto" : "smooth" });
  // Re-check after the scroll (and any layout shift, e.g. a form collapsing above) has settled.
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const missed = block === "start" ? r.top < -1 || r.top > window.innerHeight * 0.5 : r.bottom < 0 || r.top > window.innerHeight;
    if (missed) el.scrollIntoView({ block });
  }, 700);
}

/** Shown when an unfinished form was restored from this device. */
export function DraftNotice({ savedAt, locale, onDiscard, note }: { savedAt: number; locale: "en" | "de"; onDiscard: () => void; note?: string }) {
  const when = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(savedAt);
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-mist px-4 py-3 text-sm text-pine">
      <span>
        {locale === "de" ? `Wir haben Ihre Eingaben vom ${when} wiederhergestellt.` : `We restored what you entered on ${when}.`}
        {note && <span className="block text-xs text-stone">{note}</span>}
      </span>
      <button type="button" onClick={onDiscard} className="text-xs font-semibold underline underline-offset-2">
        {locale === "de" ? "Neu beginnen" : "Start over"}
      </button>
    </div>
  );
}
