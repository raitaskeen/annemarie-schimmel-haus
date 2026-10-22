"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { placementAction } from "@/server/actions/public";
import { placementSchema, type PlacementInput } from "@/lib/schemas/public-forms";
import type { CommonDictionary } from "@/i18n/common";
import type { Locale } from "@/i18n/config";
import type { FormsCopy } from "@/content/forms";
import { formatCnicInput, uuid } from "@/lib/client/uuid";
import { cn } from "@/lib/utils";
import { CheckRow, ChoiceCards, DraftNotice, FormAlert, FormRow, Honeypot, revealFirstError, TextArea, TextInput } from "./form-kit";
import { useFormDraft } from "./use-form-draft";
import { HumanCheck } from "./human-check";
import { SuccessPanel } from "./success-panel";

export type PlacementOption = { id: string; label: string; meta: string; levels: string[]; disabled: boolean; badge?: string };

type Props = {
  locale: Locale;
  sessions: PlacementOption[];
  form: CommonDictionary["form"];
  common: CommonDictionary["common"];
  forms: FormsCopy;
  links: { track: string; privacy: string };
  labels: { session: string; level: string; prior: string; priorHint: string; submit: string };
};

export function PlacementForm({ locale, sessions, form, common, forms, links, labels }: Props) {
  const firstOpen = sessions.find((s) => !s.disabled);
  const [result, setResult] = useState<{ reference: string; email: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [pending, start] = useTransition();
  const { register, handleSubmit, setValue, watch, formState, setError, reset, getValues } = useForm<PlacementInput>({
    resolver: zodResolver(placementSchema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: {
      sessionId: firstOpen?.id,
      idempotencyKey: "",
      whatsappOptIn: true,
      privacyConsent: false as unknown as true,
      humanToken: "",
      humanAnswer: "",
      website: "",
    },
  });
  // Generated after mount (never during prerender); stable across retries of this form.
  useEffect(() => {
    setValue("idempotencyKey", uuid());
  }, [setValue]);
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft("placement", { watch, reset, getValues }, !result);
  // eslint-disable-next-line react-hooks/incompatible-library -- live form values drive the UI; the React Compiler is not enabled
  const v = watch();
  const selected = sessions.find((s) => s.id === v.sessionId);
  const err = (k: keyof PlacementInput) => {
    const m = formState.errors[k]?.message as string | undefined;
    return m ? ((form.errors as Record<string, string>)[m] ?? form.errors.generic) : undefined;
  };

  if (result) {
    return (
      <SuccessPanel
        title={forms.placement.title}
        lead={`${forms.placement.lead} ${forms.keepIt}`}
        reference={result.reference}
        referenceLabel={forms.referenceLabel}
        steps={forms.placement.steps}
        trackHref={`${links.track}?ref=${result.reference}`}
        trackLabel={forms.trackLabel}
        copyLabels={{ copy: common.copy, copied: common.copied }}
        notice={{ email: result.email }}
      />
    );
  }

  const onSubmit = handleSubmit(
    (data) =>
      new Promise<void>((resolve) =>
        start(async () => {
          setServerError(null);
          const res = await placementAction(locale, v).catch(() => ({ ok: false as const, error: "generic" as const }));
          if (res.ok) {
            draft.clear();
            setResult({ reference: res.reference, email: data.email });
          }
          else {
            setRefresh((n) => n + 1);
            if (res.error === "validation" && "fieldErrors" in res) for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof PlacementInput, { message: m });
            if (res.error === "human") setError("humanAnswer", { message: "human" });
            const key = res.error === "closed" && "message" in res && res.message === "full" ? "full" : res.error;
            setServerError(forms.errors[key as keyof FormsCopy["errors"]] ?? forms.errors.generic);
            revealFirstError(formRef.current);
          }
          resolve();
        }),
      ),
    () => revealFirstError(formRef.current),
  );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="relative grid gap-6">
      <Honeypot register={register("website")} />
      {draft.restoredAt && <DraftNotice savedAt={draft.restoredAt} locale={locale} onDiscard={() => { draft.discard(); reset(); }} />}
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <FormRow label={labels.session} required error={err("sessionId")}>
        {() => (
          <ChoiceCards
            name="sessionId"
            columns={1}
            value={v.sessionId}
            onChange={(id) => {
              setValue("sessionId", id, { shouldValidate: true });
              const s = sessions.find((x) => x.id === id);
              if (s && v.targetLevel && !s.levels.includes(v.targetLevel)) setValue("targetLevel", undefined as unknown as "A2");
            }}
            options={sessions.map((s) => ({
              value: s.id,
              label: s.label,
              description: s.meta,
              disabled: s.disabled,
              badge: s.badge ? <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-pine">{s.badge}</span> : undefined,
            }))}
          />
        )}
      </FormRow>

      <FormRow label={labels.level} required error={err("targetLevel")}>
        {() => (
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {(selected?.levels ?? ["A2", "B1", "B2"]).map((lv) => (
              <button
                key={lv}
                type="button"
                role="radio"
                aria-checked={v.targetLevel === lv}
                onClick={() => setValue("targetLevel", lv as PlacementInput["targetLevel"], { shouldValidate: true })}
                className={cn(
                  "h-12 min-w-20 rounded-2xl px-5 font-mono text-lg font-semibold transition-all",
                  v.targetLevel === lv ? "bg-forest text-lime shadow-lg" : "bg-white/70 text-forest ring-1 ring-input hover:ring-ash",
                )}
              >
                {lv}
              </button>
            ))}
          </div>
        )}
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label={form.firstName} required error={err("firstName")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="given-name" {...register("firstName")} />}
        </FormRow>
        <FormRow label={form.lastName} required error={err("lastName")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="family-name" {...register("lastName")} />}
        </FormRow>
        <FormRow label={form.email} required error={err("email")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" inputMode="email" autoComplete="email" {...register("email")} />}
        </FormRow>
        <FormRow label={form.phone} hint={form.phoneHint} required error={err("phone")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />}
        </FormRow>
        <FormRow label={form.cnic} hint={form.cnicHint} required error={err("cnic")}>
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
        <FormRow label={form.dob} required error={err("dateOfBirth")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="date" autoComplete="bday" min="1930-01-01" max="2015-12-31" {...register("dateOfBirth")} />}
        </FormRow>
      </div>

      <FormRow label={labels.prior} hint={labels.priorHint} required error={err("priorLearning")}>
        {(a) => <TextArea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={3} maxLength={600} {...register("priorLearning")} />}
      </FormRow>

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
        disabled={pending || !firstOpen}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-forest px-8 font-semibold text-white shadow-[0_14px_30px_-16px_rgb(16_36_28/0.9)] transition-colors hover:bg-pine disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <ClipboardCheck className="size-5" />}
        {pending ? form.submitting : labels.submit}
      </button>
    </form>
  );
}
