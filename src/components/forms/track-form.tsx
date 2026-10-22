"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  Check,
  CircleDot,
  Clock,
  FileSearch,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Ticket,
  User,
  Wallet,
  CircleX,
  BadgeCheck,
} from "lucide-react";
import { cancelApplicationAction, reportPaymentAction, trackAction } from "@/server/actions/public";
import type { TrackResult } from "@/server/submissions/track";
import type { CommonDictionary } from "@/i18n/common";
import type { Locale } from "@/i18n/config";
import type { TrackCopy } from "@/content/track";
import type { FormsCopy } from "@/content/forms";
import { formatDateTime } from "@/lib/format";
import { forgetApplications, rememberedApplications, type RememberedApplication } from "@/lib/client/device-memory";
import { cn } from "@/lib/utils";
import { FormAlert, FormRow, TextInput } from "./form-kit";
import { HumanCheck } from "./human-check";
import { QrCode } from "./qr-code";

type Props = { locale: Locale; t: TrackCopy; form: CommonDictionary["form"]; forms: FormsCopy; links: { courses: string } };

export function TrackForm(props: Props) {
  const params = useSearchParams();
  return <TrackFormInner key={params.get("ref") ?? ""} initialRef={params.get("ref") ?? ""} {...props} />;
}

function TrackFormInner({ locale, t, form, forms, links, initialRef }: Props & { initialRef: string }) {
  const [reference, setReference] = useState(initialRef.toUpperCase());
  const [phone, setPhone] = useState("");
  const [answer, setAnswer] = useState("");
  const [token, setToken] = useState("");
  const [website, setWebsite] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (result) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [result]);

  const submit = () => {
    setAlert(null);
    const local: Record<string, string> = {};
    if (!reference.trim()) local.reference = form.errors.required;
    if (!phone.trim()) local.phone = form.errors.required;
    if (!answer.trim()) local.humanAnswer = form.errors.required;
    setErrors(local);
    if (Object.keys(local).length) return;
    start(async () => {
      const res = await trackAction(locale, { reference, phone, humanToken: token, humanAnswer: answer, website }).catch(() => ({ ok: false as const, error: "generic" as const }));
      if (res.ok) {
        setResult(res.result);
        return;
      }
      setRefresh((n) => n + 1);
      if (res.error === "validation") {
        const fe = "fieldErrors" in res ? (res.fieldErrors ?? {}) : {};
        setErrors({
          ...(fe.reference ? { reference: t.referenceHint } : {}),
          ...(fe.phone ? { phone: form.errors.phone } : {}),
        });
        return;
      }
      if (res.error === "human") setErrors({ humanAnswer: form.errors.human });
      setAlert(forms.errors[res.error as keyof FormsCopy["errors"]] ?? forms.errors.generic);
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {result ? (
        <m.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
          <TrackResultView r={result} locale={locale} t={t} links={links} onChange={setResult} />
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAnswer("");
              setRefresh((n) => n + 1);
            }}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-forest ring-1 ring-ink/15 hover:bg-cream"
          >
            <RotateCcw className="size-4" /> {t.another}
          </button>
        </m.div>
      ) : (
        <m.form
          key="form"
          noValidate
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid gap-5"
        >
          {alert && <FormAlert>{alert}</FormAlert>}
          <div className="absolute -left-[9999px]" aria-hidden>
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <RecentApplications locale={locale} kinds={t.kinds} onPick={setReference} />
          <FormRow label={t.reference} hint={t.referenceHint} required error={errors.reference}>
            {(a) => (
              <TextInput
                id={a.id}
                aria-describedby={a.describedBy}
                aria-invalid={a.invalid}
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ASH-E-7K3M9Q"
                maxLength={14}
                className="h-14 font-mono text-lg tracking-[0.15em]"
              />
            )}
          </FormRow>
          <FormRow label={t.phone} hint={form.phoneHint} required error={errors.phone}>
            {(a) => <TextInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </FormRow>
          <HumanCheck locale={locale} answer={answer} onAnswer={setAnswer} onToken={setToken} refreshKey={refresh} error={errors.humanAnswer} labels={form.human} />
          <button
            type="submit"
            disabled={pending}
            className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-forest px-8 text-base font-semibold text-white shadow-[0_14px_30px_-16px_rgb(16_36_28/0.9)] transition-colors hover:bg-pine disabled:opacity-70"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : <FileSearch className="size-5" />}
            {pending ? t.checking : t.submit}
          </button>
          <p className="text-center text-xs text-stone">{t.privacy}</p>
        </m.form>
      )}
    </AnimatePresence>
  );
}

const TONE = {
  positive: "bg-[#e3f3e7] text-[#13623a] ring-[#b9e2c6]",
  pending: "bg-[#fff4dc] text-[#7a4a00] ring-[#f3d79c]",
  neutral: "bg-mist text-pine ring-mint",
  negative: "bg-[#fdecea] text-[#8a1c12] ring-[#f5c2bc]",
} as const;

function TrackResultView({ r, locale, t, links, onChange }: { r: TrackResult; locale: Locale; t: TrackCopy; links: { courses: string }; onChange: (r: TrackResult) => void }) {
  const downloadIcs = () => {
    if (!r.calendar) return;
    const blob = new Blob([r.calendar.ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.calendar.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="@container overflow-hidden rounded-[2rem] bg-cream ring-1 ring-ink/10" aria-live="polite">
      <header className="relative overflow-hidden bg-forest p-6 text-white sm:p-8">
        <div className="absolute -top-16 -right-10 size-56 rounded-full bg-lime/15 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-lime">{t.kinds[r.kind]}</p>
            <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{r.title}</h2>
            <p className="mt-1 text-sm text-white/70">{r.subtitle}</p>
          </div>
          <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1", TONE[r.tone])}>
            <CircleDot className="size-4" /> {r.statusLabel}
          </span>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/70">
          <span className="font-mono text-base font-bold tracking-[0.12em] text-white">{r.reference}</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" /> {t.submitted}: {formatDateTime(r.submittedAt, locale)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw className="size-3.5" /> {t.lastUpdate}: {formatDateTime(r.updatedAt, locale)}
          </span>
        </div>
      </header>

      <div className="grid gap-8 p-6 sm:p-8 @3xl:grid-cols-[1.1fr_1fr]">
        <section aria-label={t.progress}>
          <h3 className="eyebrow text-ash">{t.progress}</h3>
          <ol className="mt-5 grid gap-0">
            {r.timeline.map((s, i) => {
              const last = i === r.timeline.length - 1;
              return (
                <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && <span className={cn("absolute top-8 left-[15px] h-[calc(100%-1.5rem)] w-0.5", s.state === "done" ? "bg-ash" : "bg-ink/10")} aria-hidden />}
                  <span
                    className={cn(
                      "relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-cream",
                      s.state === "done" && "bg-ash text-white",
                      s.state === "current" && "bg-lime text-forest",
                      s.state === "upcoming" && "bg-white text-stone ring-1 ring-ink/15",
                      s.state === "alert" && "bg-[#c0392b] text-white",
                    )}
                  >
                    {s.state === "done" ? <Check className="size-4" strokeWidth={3} /> : s.state === "alert" ? <AlertTriangle className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    {s.state === "current" && <span className="absolute inset-0 animate-ping rounded-full bg-lime/50 motion-reduce:hidden" aria-hidden />}
                  </span>
                  <div className="pt-1">
                    <p className={cn("text-sm font-semibold", s.state === "upcoming" ? "text-stone" : "text-forest")}>{s.label}</p>
                    {s.at && <p className="text-xs text-stone">{formatDateTime(s.at, locale)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>

          {r.nextSteps.length > 0 && (
            <div className="mt-8 rounded-2xl bg-mist p-5">
              <h3 className="text-sm font-semibold text-pine">{t.nextSteps}</h3>
              <ul className="mt-2 grid gap-2 text-sm text-ink/85">
                {r.nextSteps.map((s) => (
                  <li key={s} className="flex gap-2">
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-ash" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="grid content-start gap-5">
          {r.ticket && (
            <section className="flex items-center gap-5 rounded-2xl bg-white p-5 ring-1 ring-ink/10">
              <QrCode matrix={r.ticket.qr} label={`${t.ticket}: ${r.reference}`} className="size-28 shrink-0 rounded-lg" />
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-forest">
                  <Ticket className="size-4 text-ash" /> {t.ticket}
                </p>
                <p className="mt-1 text-xs text-stone">{t.ticketHint}</p>
                {r.ticket.guests > 0 && (
                  <p className="mt-2 text-xs font-semibold text-pine">
                    + {r.ticket.guests} {t.guests}
                  </p>
                )}
              </div>
            </section>
          )}

          {r.result && (
            <section className="rounded-2xl bg-forest p-5 text-white">
              <p className="eyebrow text-lime">{t.result}</p>
              <p className="mt-1 font-display text-5xl">{r.result.level}</p>
              {r.result.score !== null && (
                <p className="text-xs text-white/70">
                  {t.score}: {r.result.score}
                </p>
              )}
              <Link href={links.courses} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lime">
                {t.applyNow} <ArrowRight className="size-4" />
              </Link>
            </section>
          )}

          <section className="rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
            <h3 className="eyebrow text-ash">{t.details}</h3>
            <dl className="mt-3 grid gap-3 text-sm">
              {r.details.map((d) => (
                <div key={d.label} className="flex justify-between gap-4 border-b border-dashed border-ink/10 pb-2 last:border-0 last:pb-0">
                  <dt className="text-stone">{d.label}</dt>
                  <dd className="text-right font-medium text-ink">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {r.payment && (
            <section className="rounded-2xl bg-[#fff8e8] p-5 ring-1 ring-[#f3d79c]">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#7a4a00]">
                <Wallet className="size-4" /> {t.payment} · {t.amountDue}: {r.payment.amount}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{r.payment.instructions}</p>
            </section>
          )}

          <ManagePanel r={r} locale={locale} t={t} onChange={onChange} />

          <section className="grid gap-2 rounded-2xl bg-white/70 p-5 text-sm ring-1 ring-ink/10">
            <p className="eyebrow text-ash">{t.applicant}</p>
            <p className="flex items-center gap-2">
              <User className="size-4 text-ash" /> {r.applicant.name}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-ash" /> {r.applicant.email}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-ash" /> {r.applicant.phone}
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            {r.calendar && (
              <button type="button" onClick={downloadIcs} className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white hover:bg-pine">
                <CalendarPlus className="size-4" /> {t.calendar}
              </button>
            )}
            <a href={`mailto:${r.contactEmail}?subject=${encodeURIComponent(r.reference)}`} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-forest ring-1 ring-ink/15 hover:bg-white">
              <Mail className="size-4" /> {t.questions} {r.contactEmail}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Self-service: report a payment or cancel, authorised by the signed token from the lookup. */
function ManagePanel({ r, locale, t, onChange }: { r: TrackResult; locale: Locale; t: TrackCopy; onChange: (r: TrackResult) => void }) {
  const c = t.manage;
  const [mode, setMode] = useState<"idle" | "pay" | "cancel">("idle");
  const [paymentRef, setPaymentRef] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const paidSeat = r.kind === "enrollment" && r.status === "confirmed";
  if (!r.manage.canCancel && !r.manage.canReportPayment && !paidSeat) return message ? <FormAlert tone="info">{message.text}</FormAlert> : null;

  const fail = (error: string) => setMessage({ tone: "error", text: error === "expired" ? c.expired : error === "validation" ? c.invalidRef : error === "not_allowed" ? c.notAllowed : c.notAllowed });
  const run = (fn: () => ReturnType<typeof cancelApplicationAction>, okText?: string) =>
    start(async () => {
      setMessage(null);
      const res = await fn().catch(() => ({ ok: false as const, error: "generic" as const }));
      if (!res.ok) return fail(res.error);
      setMode("idle");
      onChange(res.result);
      if (okText) setMessage({ tone: "ok", text: okText });
    });

  return (
    <section className="grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-ink/10" aria-labelledby="manage-title">
      <p id="manage-title" className="eyebrow text-ash">
        {c.title}
      </p>
      {message && <FormAlert tone={message.tone === "ok" ? "info" : "error"}>{message.text}</FormAlert>}
      {paidSeat && <p className="text-sm text-stone">{c.paidOffice}</p>}

      {r.manage.canReportPayment && r.manage.paymentReported && mode !== "pay" && (
        <div className="flex gap-3 rounded-xl bg-[#e3f3e7] p-4 text-sm text-[#13623a]">
          <BadgeCheck className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">{c.reported}</p>
            <p className="mt-0.5">{c.reportedText.replace("{ref}", r.manage.paymentReported)}</p>
            <button type="button" onClick={() => setMode("pay")} className="mt-2 text-xs font-semibold underline underline-offset-2">
              {c.update}
            </button>
          </div>
        </div>
      )}

      {r.manage.canReportPayment && mode === "pay" && (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => reportPaymentAction(locale, r.manage.token, { paymentRef, note }));
          }}
        >
          <p className="font-semibold text-forest">{c.paidTitle}</p>
          <p className="text-sm text-stone">{c.paidText}</p>
          <FormRow label={c.paymentRef} required>
            {(a) => <TextInput id={a.id} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} maxLength={60} autoComplete="off" spellCheck={false} className="font-mono" required />}
          </FormRow>
          <FormRow label={c.paymentNote}>
            {(a) => <TextInput id={a.id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={c.paymentNotePlaceholder} />}
          </FormRow>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white hover:bg-pine disabled:opacity-70">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />} {c.send}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-stone hover:bg-mist">
              {c.keep}
            </button>
          </div>
        </form>
      )}

      {mode === "cancel" && (
        <div className="grid gap-3 rounded-xl bg-[#fdecea] p-4 text-sm text-[#8a1c12]" role="alertdialog" aria-labelledby="cancel-title">
          <p id="cancel-title" className="font-semibold">
            {c.cancelTitle}
          </p>
          <p>{c.cancelText}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelApplicationAction(locale, r.manage.token), c.cancelled)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#8a1c12] px-5 font-semibold text-white hover:bg-[#6d160e] disabled:opacity-70"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CircleX className="size-4" />} {c.cancelConfirm}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="inline-flex h-11 items-center rounded-full px-4 font-semibold text-forest ring-1 ring-ink/15 hover:bg-white">
              {c.keep}
            </button>
          </div>
        </div>
      )}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {r.manage.canReportPayment && !r.manage.paymentReported && (
            <button type="button" onClick={() => setMode("pay")} className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-semibold text-forest hover:bg-lime/90">
              <Wallet className="size-4" /> {c.paid}
            </button>
          )}
          {r.manage.canCancel && (
            <button type="button" onClick={() => setMode("cancel")} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-[#8a1c12] ring-1 ring-[#f5c2bc] hover:bg-[#fdecea]">
              <CircleX className="size-4" /> {c.cancel[r.kind]}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** Applications made on this device (numbers only), so visitors never need to search their inbox. */
function RecentApplications({ locale, kinds, onPick }: { locale: Locale; kinds: TrackCopy["kinds"]; onPick: (ref: string) => void }) {
  const [items, setItems] = useState<RememberedApplication[]>([]);
  useEffect(() => {
    const t = setTimeout(() => setItems(rememberedApplications()), 0);
    return () => clearTimeout(t);
  }, []);
  if (!items.length) return null;
  const kind = (ref: string) => (ref[4] === "E" ? kinds.enrollment : ref[4] === "V" ? kinds.event : ref[4] === "P" ? kinds.placement : locale === "de" ? "Nachricht" : "Message");
  return (
    <div className="grid gap-2 rounded-2xl bg-mist p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-forest">{locale === "de" ? "Ihre Anträge auf diesem Gerät" : "Your applications on this device"}</p>
        <button
          type="button"
          onClick={() => {
            forgetApplications();
            setItems([]);
          }}
          className="text-xs text-stone underline underline-offset-2"
        >
          {locale === "de" ? "Liste löschen" : "Clear list"}
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items
          .filter((a) => a.reference[4] !== "M")
          .slice(0, 6)
          .map((a) => (
            <li key={a.reference}>
              <button type="button" onClick={() => onPick(a.reference)} className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-xs ring-1 ring-ink/10 hover:ring-ash/50">
                <span className="font-mono font-semibold text-forest">{a.reference}</span>
                <span className="text-stone">{kind(a.reference)}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
