"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CloudCheck, Loader2, Lock, Pencil } from "lucide-react";
import { enrollAction } from "@/server/actions/public";
import { DOCUMENTS, enrollmentSchema, enrollmentSteps, type DocumentKind, type EnrollmentInput } from "@/lib/schemas/public-forms";
import type { CommonDictionary } from "@/i18n/common";
import { fill } from "@/i18n/common";
import type { Locale } from "@/i18n/config";
import type { EnrollCopy } from "@/content/enroll";
import type { FormsCopy } from "@/content/forms";
import { formatCnicInput, uuid } from "@/lib/client/uuid";
import { useEnrollmentDraft } from "@/stores/enrollment-draft";
import { cn } from "@/lib/utils";
import { CheckRow, ChoiceCards, DraftNotice, FormAlert, FormRow, Honeypot, SelectInput, TextArea, TextInput } from "./form-kit";
import { DocumentDrop } from "./document-drop";
import { HumanCheck } from "./human-check";
import { SuccessPanel } from "./success-panel";
import { useHydrated } from "@/hooks/use-hydrated";

type Props = {
  locale: Locale;
  offering: { id: string; full: boolean; requiresPlacement: boolean; title: string };
  t: EnrollCopy;
  form: CommonDictionary["form"];
  common: CommonDictionary["common"];
  forms: FormsCopy;
  links: { placement: string; track: string; privacy: string; courses: string };
};

const STEP_FIELDS: FieldPath<EnrollmentInput>[][] = [
  [...enrollmentSteps.personal],
  [...enrollmentSteps.contact],
  [...enrollmentSteps.background],
  [],
  ["privacyConsent", "humanAnswer"],
];

export function EnrollmentWizard({ locale, offering, t, form, common, forms, links }: Props) {
  const hydrated = useHydrated();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [docs, setDocs] = useState<Record<DocumentKind, File | null>>({ photo: null, cnicFront: null, cnicBack: null, degree: null });
  const [docErrors, setDocErrors] = useState<Partial<Record<DocumentKind, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [humanRefresh, setHumanRefresh] = useState(0);
  const [result, setResult] = useState<{ reference: string; status: string; email: string; phone: string; whatsapp: boolean } | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const draft = useEnrollmentDraft();

  const methods = useForm<EnrollmentInput>({
    resolver: zodResolver(enrollmentSchema),
    mode: "onTouched",
    defaultValues: {
      offeringId: offering.id,
      idempotencyKey: "",
      humanToken: "",
      humanAnswer: "",
      website: "",
      education: undefined,
      priorLearning: offering.requiresPlacement ? undefined : "none",
      whatsappOptIn: true,
      privacyConsent: false as unknown as true,
    },
  });
  const { register, setValue, watch, trigger, getValues, formState, setError, reset } = methods;
  const errors = formState.errors;
  // Generated after mount (never during prerender); stable across retries of this form.
  useEffect(() => {
    setValue("idempotencyKey", uuid());
  }, [setValue]);
  // eslint-disable-next-line react-hooks/incompatible-library -- live form values drive the UI; the React Compiler is not enabled
  const values = watch();

  // Restore a saved draft once (identity numbers and files are never stored).
  useEffect(() => {
    void Promise.resolve(useEnrollmentDraft.persist.rehydrate()).then(() => {
      const saved = useEnrollmentDraft.getState().drafts[offering.id];
      if (saved && Date.now() - saved.savedAt < 14 * 86_400_000) {
        reset({ ...getValues(), ...(saved.values as Partial<EnrollmentInput>) });
        // The CNIC is never stored on the device, so a resumed application starts on the
        // first step (everything else is filled in) instead of failing only at the end.
        setStep(0);
        setResumedAt(saved.savedAt);
        setSavedAt(saved.savedAt);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offering.id]);

  // Autosave (debounced).
  useEffect(() => {
    if (result) return;
    const id = window.setTimeout(() => {
      draft.save(offering.id, getValues() as Record<string, string | boolean>, step);
      setSavedAt(Date.now());
    }, 700);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), step]);

  const err = (key?: string) => (key ? ((form.errors as Record<string, string>)[key] ?? (forms.files as Record<string, string>)[key] ?? form.errors.generic) : undefined);
  const e = (name: keyof EnrollmentInput) => err(errors[name]?.message as string | undefined);

  const go = (to: number) => {
    setDirection(to > step ? 1 : -1);
    setStep(to);
    setServerError(null);
    requestAnimationFrame(() => heading.current?.focus());
  };

  const lastDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
  const samePhones = () => lastDigits(getValues("emergencyPhone")) === lastDigits(getValues("phone"));

  const next = async () => {
    if (step === 3) {
      const missing = (Object.keys(DOCUMENTS) as DocumentKind[]).filter((k) => DOCUMENTS[k].required && !docs[k]);
      if (missing.length) {
        setDocErrors(Object.fromEntries(missing.map((k) => [k, forms.files.required])));
        return;
      }
      return go(4);
    }
    const ok = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (!ok) return;
    // Cross-field rule from the schema, checked here so nobody only learns about it at the end.
    if (step === 1 && samePhones()) {
      setError("emergencyPhone", { message: "samePhone" }, { shouldFocus: true });
      return;
    }
    go(step + 1);
  };

  const firstErrorStep = (fieldErrors: Record<string, unknown>) => {
    const keys = Object.keys(fieldErrors);
    const index = STEP_FIELDS.findIndex((fields) => fields.some((f) => keys.includes(f)));
    if (keys.some((k) => k in DOCUMENTS)) return 3;
    return index < 0 ? 4 : index;
  };

  const submit = async () => {
    setServerError(null);
    // Validate step by step so the visitor is taken to the first step that needs attention
    // (e.g. a CNIC that has to be re-entered after resuming) and always told why.
    for (let i = 0; i < 3; i++) {
      if (await trigger(STEP_FIELDS[i])) continue;
      if (i !== step) go(i);
      setServerError(form.errors.fixFields);
      return;
    }
    if (samePhones()) {
      go(1);
      setError("emergencyPhone", { message: "samePhone" });
      setServerError(form.errors.fixFields);
      return;
    }
    const missingDocs = (Object.keys(DOCUMENTS) as DocumentKind[]).filter((k) => DOCUMENTS[k].required && !docs[k]);
    if (missingDocs.length) {
      setDocErrors(Object.fromEntries(missingDocs.map((k) => [k, forms.files.required])));
      go(3);
      setServerError(form.errors.fixFields);
      return;
    }
    if (!(await trigger(undefined, { shouldFocus: true }))) {
      setServerError(form.errors.fixFields);
      return;
    }
    const v = getValues();
    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) fd.append(k, typeof val === "boolean" ? String(val) : String(val ?? ""));
    for (const [k, f] of Object.entries(docs)) if (f) fd.append(k, f);

    startTransition(async () => {
      const res = await enrollAction(locale, fd).catch(() => ({ ok: false as const, error: "generic" as const }));
      if (res.ok) {
        draft.clear(offering.id);
        setResult({ reference: res.reference, status: res.status, email: v.email ?? "", phone: v.phone ?? "", whatsapp: !!v.whatsappOptIn });
        return;
      }
      if (res.error === "human") {
        setHumanRefresh((n) => n + 1);
        setError("humanAnswer", { message: "human" });
        setServerError(forms.errors.human);
        return;
      }
      if (res.error === "validation" || res.error === "files") {
        const fe = res.fieldErrors ?? {};
        for (const [k, msg] of Object.entries(fe)) {
          if (k in DOCUMENTS) setDocErrors((d) => ({ ...d, [k]: err(msg) }));
          else setError(k as FieldPath<EnrollmentInput>, { message: msg });
        }
        go(firstErrorStep(fe));
        setServerError(forms.errors[res.error]);
        return;
      }
      setHumanRefresh((n) => n + 1);
      setServerError(forms.errors[res.error as keyof FormsCopy["errors"]] ?? forms.errors.generic);
    });
  };

  const total = t.steps.length;
  const progress = ((step + 1) / total) * 100;
  const educationOptions = useMemo(() => Object.entries(form.educationOptions) as [string, string][], [form.educationOptions]);

  if (result) {
    const waitlisted = result.status === "waitlisted";
    return (
      <SuccessPanel
        tone={waitlisted ? "waitlist" : "success"}
        title={waitlisted ? forms.enrollment.waitTitle : forms.enrollment.title}
        lead={`${waitlisted ? forms.enrollment.waitLead : forms.enrollment.lead} ${forms.keepIt}`}
        reference={result.reference}
        referenceLabel={forms.referenceLabel}
        steps={forms.enrollment.steps}
        trackHref={`${links.track}?ref=${result.reference}`}
        trackLabel={forms.trackLabel}
        copyLabels={{ copy: common.copy, copied: common.copied }}
        notice={{ email: result.email, whatsapp: result.whatsapp ? result.phone : null }}
        secondary={{ label: common.back, href: links.courses }}
      />
    );
  }

  return (
    <div className="grid gap-8">
      {/* progress */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between text-xs font-semibold text-stone">
          <span>{fill(t.stepOf, { n: step + 1, total })}</span>
          {savedAt && (
            <span className="inline-flex items-center gap-1.5 text-pine">
              <CloudCheck className="size-3.5" /> {t.draftSaved}
            </span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
          <m.div className="h-full rounded-full bg-gradient-to-r from-ash to-lime" animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
        </div>
        <ol className="hidden grid-cols-5 gap-2 sm:grid">
          {t.steps.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => i < step && go(i)}
                className={cn("flex w-full items-center gap-2 text-left text-xs font-semibold transition-colors", i === step ? "text-forest" : i < step ? "text-ash hover:text-forest" : "text-stone/60")}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px]", i < step ? "bg-ash text-white" : i === step ? "bg-forest text-lime" : "bg-ink/10")}>
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="truncate">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <form method="post" data-ready={hydrated || undefined}
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          if (step === total - 1) void submit();
          else void next();
        }}
        className="relative"
      >
        <Honeypot register={register("website")} />
        <div className="mb-6">
          <h2 ref={heading} tabIndex={-1} className="font-display text-3xl text-forest outline-none sm:text-4xl">
            {t.steps[step].title}
          </h2>
          <p className="mt-1 text-stone">{t.steps[step].description}</p>
        </div>

        {resumedAt && step === 0 && (
          <div className="mb-6">
            <DraftNotice
              savedAt={resumedAt}
              locale={locale}
              note={
                locale === "de"
                  ? "Bitte geben Sie Ihre CNIC-Nummer erneut ein und laden Sie die Dokumente noch einmal hoch, beides speichern wir aus Datenschutzgründen nie auf Ihrem Gerät."
                  : "Please enter your CNIC number again and re-attach your documents, for your privacy we never store either on your device."
              }
              onDiscard={() => {
                draft.clear(offering.id);
                setResumedAt(null);
                setSavedAt(null);
                reset();
              }}
            />
          </div>
        )}
        {serverError && (
          <div className="mb-6">
            <FormAlert>{serverError}</FormAlert>
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <m.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-5"
          >
            {step === 0 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormRow label={form.firstName} required error={e("firstName")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="given-name" {...register("firstName")} />}
                  </FormRow>
                  <FormRow label={form.lastName} required error={e("lastName")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="family-name" {...register("lastName")} />}
                  </FormRow>
                </div>
                <FormRow label={form.guardianName} required error={e("guardianName")}>
                  {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="off" {...register("guardianName")} />}
                </FormRow>
                <FormRow label={form.cnic} hint={form.cnicHint} required error={e("cnic")}>
                  {(a) => (
                    <TextInput
                      id={a.id}
                      aria-describedby={a.describedBy}
                      aria-invalid={a.invalid}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="35202-1234567-1"
                      maxLength={15}
                      className="font-mono tracking-wider"
                      {...register("cnic", { onChange: (ev) => setValue("cnic", formatCnicInput(ev.target.value)) })}
                    />
                  )}
                </FormRow>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormRow label={form.dob} required error={e("dateOfBirth")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="date" autoComplete="bday" max="2015-12-31" min="1930-01-01" {...register("dateOfBirth")} />}
                  </FormRow>
                  <FormRow label={form.placeOfBirth} required error={e("placeOfBirth")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="off" {...register("placeOfBirth")} />}
                  </FormRow>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormRow label={form.email} hint={form.emailHint} required error={e("email")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" inputMode="email" autoComplete="email" {...register("email")} />}
                  </FormRow>
                  <FormRow label={form.phone} hint={form.phoneHint} required error={e("phone")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />}
                  </FormRow>
                </div>
                <CheckRow checked={!!values.whatsappOptIn} onChange={(v) => setValue("whatsappOptIn", v)}>
                  {form.whatsappOptIn}
                </CheckRow>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormRow label={form.emergencyName} required error={e("emergencyName")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="off" {...register("emergencyName")} />}
                  </FormRow>
                  <FormRow label={form.emergencyPhone} required error={e("emergencyPhone")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="off" {...register("emergencyPhone")} />}
                  </FormRow>
                </div>
                <FormRow label={form.address} required error={e("address")}>
                  {(a) => <TextArea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={2} autoComplete="street-address" className="min-h-24" {...register("address")} />}
                </FormRow>
                <FormRow label={form.city} required error={e("city")} className="sm:max-w-xs">
                  {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="address-level2" placeholder="Lahore" {...register("city")} />}
                </FormRow>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormRow label={form.education} required error={e("education")}>
                    {(a) => (
                      <SelectInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} defaultValue="" {...register("education")}>
                        <option value="" disabled>
                          , 
                        </option>
                        {educationOptions.map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </SelectInput>
                    )}
                  </FormRow>
                  <FormRow label={form.occupation} optionalLabel={common.optional} error={e("occupation")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="organization-title" {...register("occupation")} />}
                  </FormRow>
                </div>
                <FormRow label={form.priorLearning} required error={e("priorLearning")}>
                  {(a) => (
                    <ChoiceCards
                      name="priorLearning"
                      value={values.priorLearning}
                      invalid={a.invalid}
                      describedBy={a.describedBy}
                      onChange={(v) => setValue("priorLearning", v, { shouldValidate: true })}
                      options={(Object.entries(form.priorOptions) as [EnrollmentInput["priorLearning"], string][]).map(([v, label]) => ({ value: v, label }))}
                    />
                  )}
                </FormRow>
                {offering.requiresPlacement && (values.priorLearning === "none" || values.priorLearning === "other") && (
                  <FormAlert tone="info">
                    {t.placementNotice}{" "}
                    <Link href={links.placement} className="font-semibold underline underline-offset-4">
                      {t.placementLink}
                    </Link>
                  </FormAlert>
                )}
                {values.priorLearning && values.priorLearning !== "none" && (
                  <FormRow label={form.priorDetails} required={values.priorLearning !== "ash_student"} optionalLabel={common.optional} error={e("priorDetails")}>
                    {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} {...register("priorDetails")} />}
                  </FormRow>
                )}
                <FormRow label={form.motivation} hint={`${form.motivationHint} · ${fill(t.charCount, { n: (values.motivation ?? "").length })}`} required error={e("motivation")}>
                  {(a) => <TextArea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} rows={5} maxLength={1500} {...register("motivation")} />}
                </FormRow>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  {(Object.keys(DOCUMENTS) as DocumentKind[]).map((k) => (
                    <DocumentDrop
                      key={k}
                      label={t.docs[k].label}
                      hint={t.docs[k].hint}
                      required={DOCUMENTS[k].required}
                      accept={DOCUMENTS[k].accept}
                      file={docs[k]}
                      error={docErrors[k]}
                      onFile={(file, error) => {
                        setDocs((d) => ({ ...d, [k]: file }));
                        setDocErrors((d) => ({ ...d, [k]: error }));
                      }}
                      labels={{ ...t.docs, tooLarge: forms.files.file_too_large, type: forms.files.file_type, optional: common.optional }}
                    />
                  ))}
                </div>
                <p className="flex items-center gap-2 rounded-2xl bg-mist p-4 text-xs text-pine">
                  <Lock className="size-4 shrink-0" />
                  {t.docs.privacy}
                </p>
              </>
            )}

            {step === 4 && (
              <>
                <ReviewSection title={t.review.sections.personal} onEdit={() => go(0)} editLabel={t.review.edit}>
                  <ReviewItem label={form.fullName} value={`${values.firstName ?? ""} ${values.lastName ?? ""}`} />
                  <ReviewItem label={form.guardianName} value={values.guardianName} />
                  <ReviewItem label={form.cnic} value={values.cnic} mono />
                  <ReviewItem label={form.dob} value={values.dateOfBirth} />
                  <ReviewItem label={form.placeOfBirth} value={values.placeOfBirth} />
                </ReviewSection>
                <ReviewSection title={t.review.sections.contact} onEdit={() => go(1)} editLabel={t.review.edit}>
                  <ReviewItem label={form.email} value={values.email} />
                  <ReviewItem label={form.phone} value={values.phone} />
                  <ReviewItem label={form.emergencyName} value={`${values.emergencyName ?? ""} · ${values.emergencyPhone ?? ""}`} />
                  <ReviewItem label={form.address} value={`${values.address ?? ""}, ${values.city ?? ""}`} />
                </ReviewSection>
                <ReviewSection title={t.review.sections.background} onEdit={() => go(2)} editLabel={t.review.edit}>
                  <ReviewItem label={form.education} value={values.education ? form.educationOptions[values.education] : ""} />
                  <ReviewItem label={form.priorLearning} value={values.priorLearning ? form.priorOptions[values.priorLearning] : ""} />
                  <ReviewItem label={form.motivation} value={values.motivation} wide />
                </ReviewSection>
                <ReviewSection title={t.review.sections.documents} onEdit={() => go(3)} editLabel={t.review.edit}>
                  {(Object.keys(DOCUMENTS) as DocumentKind[]).map((k) => (
                    <ReviewItem key={k} label={t.docs[k].label} value={docs[k] ? `✓ ${t.review.attached}` : DOCUMENTS[k].required ? `✕ ${t.review.missing}` : "·"} />
                  ))}
                </ReviewSection>

                <CheckRow checked={!!values.privacyConsent} onChange={(v) => setValue("privacyConsent", v as true, { shouldValidate: true })} error={e("privacyConsent")}>
                  {form.privacyConsent}{" "}
                  <Link href={links.privacy} target="_blank" className="font-semibold text-pine underline underline-offset-4">
                    {form.privacyLink}
                  </Link>
                </CheckRow>
                <HumanCheck
                  locale={locale}
                  answer={values.humanAnswer ?? ""}
                  onAnswer={(v) => setValue("humanAnswer", v, { shouldValidate: formState.isSubmitted })}
                  onToken={(token) => setValue("humanToken", token)}
                  refreshKey={humanRefresh}
                  error={errors.humanAnswer ? form.errors.human : undefined}
                  labels={form.human}
                />
                {offering.full && <FormAlert tone="info">{t.full}</FormAlert>}
              </>
            )}
          </m.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink/10 pt-6">
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0 || pending}
            className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-forest ring-1 ring-ink/15 transition-colors hover:bg-cream disabled:invisible"
          >
            <ArrowLeft className="size-4" /> {form.back}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="group inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-full bg-forest px-7 text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgb(16_36_28/0.9)] transition-colors hover:bg-pine disabled:opacity-70"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {form.submitting}
              </>
            ) : step === total - 1 ? (
              <>
                {offering.full ? t.waitlistSubmit : t.submit} <Check className="size-4" />
              </>
            ) : (
              <>
                {form.continue} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReviewSection({ title, children, onEdit, editLabel }: { title: string; children: React.ReactNode; onEdit: () => void; editLabel: string }) {
  return (
    <section className="rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-forest">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-pine hover:bg-mist">
          <Pencil className="size-3" /> {editLabel}
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function ReviewItem({ label, value, mono, wide }: { label: string; value?: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs text-stone">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-medium break-words text-ink", mono && "font-mono tracking-wide")}>{value?.trim() || "·"}</dd>
    </div>
  );
}
