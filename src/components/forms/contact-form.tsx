"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Loader2, Send } from "lucide-react";
import { contactAction } from "@/server/actions/public";
import type { z } from "zod";
import { contactSchema, type ContactInput } from "@/lib/schemas/public-forms";
import type { CommonDictionary } from "@/i18n/common";
import type { Locale } from "@/i18n/config";
import type { FormsCopy } from "@/content/forms";
import { uuid } from "@/lib/client/uuid";
import { rememberApplication } from "@/lib/client/device-memory";
import { CheckRow, DraftNotice, FormAlert, FormRow, Honeypot, revealFirstError, SelectInput, TextArea, TextInput } from "./form-kit";
import { useFormDraft } from "./use-form-draft";
import { HumanCheck } from "./human-check";

export function ContactForm({ locale, form, common, forms, privacyHref }: { locale: Locale; form: CommonDictionary["form"]; common: CommonDictionary["common"]; forms: FormsCopy; privacyHref: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [pending, start] = useTransition();
  const { register, handleSubmit, setValue, watch, formState, setError, reset, getValues } = useForm<ContactInput, unknown, z.output<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: { idempotencyKey: "", privacyConsent: false as unknown as true, humanToken: "", humanAnswer: "", website: "" },
  });
  // Generated after mount (never during prerender); stable across retries of this form.
  useEffect(() => {
    setValue("idempotencyKey", uuid());
  }, [setValue]);
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft("contact", { watch, reset, getValues }, sent === null);
  // eslint-disable-next-line react-hooks/incompatible-library -- live form values drive the UI; the React Compiler is not enabled
  const v = watch();
  const err = (k: keyof ContactInput) => {
    const m = formState.errors[k]?.message as string | undefined;
    return m ? ((form.errors as Record<string, string>)[m] ?? form.errors.generic) : undefined;
  };

  if (sent !== null) {
    return (
      <div role="status" className="rounded-3xl bg-mist p-8 text-center">
        <CircleCheck className="mx-auto size-12 text-ash" />
        <p className="mt-4 font-display text-3xl text-forest">{forms.contact.title}</p>
        <p className="mt-2 text-stone">{forms.contact.lead}</p>
        {sent && <p className="mt-4 font-mono text-sm font-semibold text-pine">{sent}</p>}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit(
        () =>
          new Promise<void>((resolve) =>
            start(async () => {
              setServerError(null);
              const res = await contactAction(locale, v).catch(() => ({ ok: false as const, error: "generic" as const }));
              if (res.ok) {
                draft.clear();
                rememberApplication(res.reference);
                setSent(res.reference);
              }
              else {
                setRefresh((n) => n + 1);
                if (res.error === "human") setError("humanAnswer", { message: "human" });
                setServerError(forms.errors[res.error as keyof FormsCopy["errors"]] ?? forms.errors.generic);
            revealFirstError(formRef.current);
              }
              resolve();
            }),
          ),
        () => revealFirstError(formRef.current),
      )}
      className="relative grid gap-5"
    >
      <Honeypot register={register("website")} />
      {draft.restoredAt && <DraftNotice savedAt={draft.restoredAt} locale={locale} onDiscard={() => { draft.discard(); reset(); }} />}
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label={form.fullName} required error={err("name")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="name" {...register("name")} />}
        </FormRow>
        <FormRow label={form.email} required error={err("email")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" inputMode="email" autoComplete="email" {...register("email")} />}
        </FormRow>
        <FormRow label={form.phone} optionalLabel={common.optional} error={err("phone")}>
          {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />}
        </FormRow>
        <FormRow label={form.topic} required error={err("topic")}>
          {(a) => (
            <SelectInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} defaultValue="" {...register("topic")}>
              <option value="" disabled>
                , 
              </option>
              {Object.entries(form.topics).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          )}
        </FormRow>
      </div>
      <FormRow label={form.subject} required error={err("subject")}>
        {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} {...register("subject")} />}
      </FormRow>
      <FormRow label={form.message} required error={err("message")}>
        {(a) => <TextArea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={6} maxLength={3000} {...register("message")} />}
      </FormRow>
      <CheckRow checked={!!v.privacyConsent} onChange={(c) => setValue("privacyConsent", c as true, { shouldValidate: true })} error={err("privacyConsent")}>
        {form.privacyConsent}{" "}
        <Link href={privacyHref} target="_blank" className="font-semibold text-pine underline underline-offset-4">
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
      <button type="submit" disabled={pending} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-forest px-8 font-semibold text-white transition-colors hover:bg-pine disabled:opacity-70">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        {pending ? form.submitting : form.submit}
      </button>
    </form>
  );
}
