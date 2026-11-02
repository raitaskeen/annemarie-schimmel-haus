"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Minus, Plus, Ticket } from "lucide-react";
import { registerEventAction } from "@/server/actions/public";
import type { z } from "zod";
import { eventRegistrationSchema, type EventRegistrationInput } from "@/lib/schemas/public-forms";
import type { CommonDictionary } from "@/i18n/common";
import type { Locale } from "@/i18n/config";
import type { FormsCopy } from "@/content/forms";
import { formatCnicInput, uuid } from "@/lib/client/uuid";
import { CheckRow, DraftNotice, FormAlert, FormRow, Honeypot, revealFirstError, TextInput } from "./form-kit";
import { useFormDraft } from "./use-form-draft";
import { HumanCheck } from "./human-check";
import { SuccessPanel } from "./success-panel";
import { useHydrated } from "@/hooks/use-hydrated";

type Props = {
  locale: Locale;
  event: { id: string; requiresCnic: boolean; maxGuests: number; full: boolean };
  form: CommonDictionary["form"];
  common: CommonDictionary["common"];
  forms: FormsCopy;
  links: { track: string; privacy: string; events: string };
  labels: { submit: string; waitlist: string; cnicNote: string };
};

export function EventRegistrationForm({ locale, event, form, common, forms, links, labels }: Props) {
  const hydrated = useHydrated();
  const [result, setResult] = useState<{ reference: string; status: string; email: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [pending, start] = useTransition();
  const { register, handleSubmit, setValue, watch, formState, setError, reset, getValues, control } = useForm<EventRegistrationInput, unknown, z.output<typeof eventRegistrationSchema>>({
    resolver: zodResolver(eventRegistrationSchema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: { eventId: event.id, idempotencyKey: "", guestDetails: [], whatsappOptIn: true, privacyConsent: false as unknown as true, humanToken: "", humanAnswer: "", website: "" },
  });
  // Generated after mount (never during prerender); stable across retries of this form.
  useEffect(() => {
    setValue("idempotencyKey", uuid());
  }, [setValue]);
  const { fields: guestFields, append, remove } = useFieldArray({ control, name: "guestDetails" });
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft(`event:${event.id}`, { watch, reset, getValues }, !result);
  // eslint-disable-next-line react-hooks/incompatible-library -- live form values drive the UI; the React Compiler is not enabled
  const v = watch();
  const err = (k: keyof EventRegistrationInput) => {
    const m = formState.errors[k]?.message as string | undefined;
    return m ? ((form.errors as Record<string, string>)[m] ?? form.errors.generic) : undefined;
  };

  const guestErr = (i: number, k: "name" | "phone" | "cnic") => {
    const m = formState.errors.guestDetails?.[i]?.[k]?.message as string | undefined;
    return m ? ((form.errors as Record<string, string>)[m] ?? form.errors.generic) : undefined;
  };

  if (result) {
    const waitlisted = result.status === "waitlisted";
    return (
      <SuccessPanel
        tone={waitlisted ? "waitlist" : "success"}
        title={waitlisted ? forms.event.waitTitle : forms.event.title}
        lead={`${waitlisted ? forms.event.waitLead : forms.event.lead} ${forms.keepIt}`}
        reference={result.reference}
        referenceLabel={forms.ticketLabel}
        steps={forms.event.steps}
        trackHref={`${links.track}?ref=${result.reference}`}
        trackLabel={forms.trackLabel}
        copyLabels={{ copy: common.copy, copied: common.copied }}
        notice={{ email: result.email }}
        secondary={{ label: common.back, href: links.events }}
      />
    );
  }

  const onSubmit = handleSubmit(
    (data) =>
      new Promise<void>((resolve) =>
        start(async () => {
          setServerError(null);
          if (event.requiresCnic && !v.cnic) {
            setError("cnic", { message: "required" });
            return resolve();
          }
          const res = await registerEventAction(locale, v).catch(() => ({ ok: false as const, error: "generic" as const }));
          if (res.ok) {
            draft.clear();
            setResult({ reference: res.reference, status: res.status, email: data.email });
          }
          else {
            setRefresh((n) => n + 1);
            if (res.error === "validation" && "fieldErrors" in res) for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as Parameters<typeof setError>[0], { message: m });
            if (res.error === "human") setError("humanAnswer", { message: "human" });
            setServerError(forms.errors[res.error as keyof FormsCopy["errors"]] ?? forms.errors.generic);
            revealFirstError(formRef.current);
          }
          resolve();
        }),
      ),
    () => revealFirstError(formRef.current),
  );

  return (
    <form method="post" data-guard data-ready={hydrated || undefined} ref={formRef} noValidate onSubmit={onSubmit} className="relative grid gap-5">
      <Honeypot register={register("website")} />
      {draft.restoredAt && <DraftNotice savedAt={draft.restoredAt} locale={locale} onDiscard={() => { draft.discard(); reset(); }} />}
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <FormRow label={form.fullName} required error={err("name")}>
        {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="name" {...register("name")} />}
      </FormRow>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label={form.email} required error={err("email")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" inputMode="email" autoComplete="email" {...register("email")} />}
        </FormRow>
        <FormRow label={form.phone} hint={form.phoneHint} required error={err("phone")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />}
        </FormRow>
      </div>
      {event.requiresCnic && (
        <FormRow label={form.cnic} hint={labels.cnicNote} required error={err("cnic")}>
          {(a) => (
            <TextInput
              id={a.id}
              aria-describedby={a.describedBy}
              aria-invalid={a.invalid}
              inputMode="numeric"
              maxLength={15}
              placeholder="35202-1234567-1"
              className="font-mono tracking-wider"
              {...register("cnic", { onChange: (e) => setValue("cnic", formatCnicInput(e.target.value)) })}
            />
          )}
        </FormRow>
      )}
      <FormRow label={form.organization} optionalLabel={common.optional} error={err("organization")}>
        {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="organization" {...register("organization")} />}
      </FormRow>
      {event.maxGuests > 0 && (
        <fieldset className="grid gap-4 rounded-2xl border border-input bg-white/70 p-4">
          <legend className="sr-only">{form.guests}</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-forest">
              {form.guests} <span className="font-normal text-stone">({guestFields.length}/{event.maxGuests})</span>
            </span>
            <span className="text-xs text-stone">{form.guestsHint}</span>
          </div>
          {guestFields.map((field, i) => (
            <div key={field.id} className="grid gap-4 rounded-xl border border-ink/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold tracking-wide text-stone uppercase">
                  {form.guest} {i + 1}
                </span>
                <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-stone ring-1 ring-ink/15 hover:bg-mist">
                  <Minus className="size-3.5" /> {form.removeGuest}
                </button>
              </div>
              <FormRow label={form.fullName} required error={guestErr(i, "name")}>
                {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="off" {...register(`guestDetails.${i}.name`)} />}
              </FormRow>
              <div className={`grid gap-4 ${event.requiresCnic ? "sm:grid-cols-2" : ""}`}>
                <FormRow label={form.phone} optionalLabel={common.optional} error={guestErr(i, "phone")}>
                  {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="off" {...register(`guestDetails.${i}.phone`)} />}
                </FormRow>
                {event.requiresCnic && (
                  <FormRow label={form.cnic} required error={guestErr(i, "cnic")}>
                    {(a) => (
                      <TextInput
                        id={a.id}
                        aria-describedby={a.describedBy}
                        aria-invalid={a.invalid}
                        inputMode="numeric"
                        maxLength={15}
                        placeholder="35202-1234567-1"
                        className="font-mono tracking-wider"
                        {...register(`guestDetails.${i}.cnic`, { onChange: (e) => setValue(`guestDetails.${i}.cnic`, formatCnicInput(e.target.value)) })}
                      />
                    )}
                  </FormRow>
                )}
              </div>
            </div>
          ))}
          {guestFields.length < event.maxGuests && (
            <button
              type="button"
              onClick={() => append({ name: "", phone: "", cnic: "" })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-forest ring-1 ring-ink/15 hover:bg-mist"
            >
              <Plus className="size-4" /> {form.addGuest}
            </button>
          )}
        </fieldset>
      )}
      <CheckRow checked={!!v.whatsappOptIn} onChange={(c) => setValue("whatsappOptIn", c)}>
        {form.whatsappOptIn}
      </CheckRow>
      <CheckRow checked={!!v.privacyConsent} onChange={(c) => setValue("privacyConsent", c as true, { shouldValidate: true })} error={err("privacyConsent")}>
        {form.privacyConsent}{" "}
        <Link href={links.privacy} target="_blank" className="font-semibold text-pine underline underline-offset-4">
          {form.privacyLink}
        </Link>
      </CheckRow>
      <HumanCheck
        locale={locale}
        answer={v.humanAnswer ?? ""}
        onAnswer={(a) => setValue("humanAnswer", a)}
        onToken={(tok) => setValue("humanToken", tok)}
        refreshKey={refresh}
        error={formState.errors.humanAnswer ? form.errors.human : undefined}
        labels={form.human}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-forest px-8 font-semibold text-white shadow-[0_14px_30px_-16px_rgb(16_36_28/0.9)] transition-colors hover:bg-pine disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Ticket className="size-5" />}
        {pending ? form.submitting : event.full ? labels.waitlist : labels.submit}
      </button>
    </form>
  );
}
