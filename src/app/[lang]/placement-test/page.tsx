import type { Metadata } from "next";
import { lang } from "next/root-params";
import { CircleCheck, IdCard, Info, Wallet } from "lucide-react";
import { Reveal } from "@/components/motion";
import { DateBadge } from "@/components/site/blocks";
import { PlacementForm } from "@/components/forms/placement-form";
import { PageHero } from "@/components/site/page-hero";
import { formsCopy } from "@/content/forms";
import { commonDictionary, seatsLabel } from "@/i18n/common";
import { hasLocale, href, type Locale } from "@/i18n/config";
import { dateParts, formatClock, formatDate, formatPKR } from "@/lib/format";
import { getPlacementSessions } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const COPY = {
  en: {
    metaTitle: "Placement test",
    metaDescription: "Studied German elsewhere? Take the ASH placement test (A2, B1, B2) to join the right course at Annemarie-Schimmel-Haus Lahore.",
    eyebrow: "Placement test",
    title: "Find your exact level.",
    lead: "If you have studied German elsewhere and want to join one of our advanced on-campus or online courses, the placement test assesses your current skills and places you in the course that matches you best.",
    who: "Who takes the test?",
    whoText: "Only external learners who have not studied at Annemarie-Schimmel-Haus before and who do not hold an official Goethe-Institut certificate of that level.",
    bring: "Bring your original CNIC",
    bringText: "You will not be allowed to sit the test without it.",
    fee: "Test fee",
    feeText: "Non-refundable, paid at reception on the test day.",
    rights: "Rights of admission are reserved.",
    sessions: "Upcoming test dates",
    none: "The next placement test date will be published soon. Subscribe to the newsletter or contact us.",
    formTitle: "Register for the test",
    formLead: "It takes two minutes. You'll receive a confirmation by email with all details.",
    session: "Test date",
    level: "Level you are aiming for",
    prior: "Where and how long have you studied German?",
    priorHint: "e.g. “A1 and A2 at a language school in Islamabad, 2025”",
    submit: "Register for the placement test",
    deadline: "Registration deadline",
  },
  de: {
    metaTitle: "Einstufungstest",
    metaDescription: "Schon anderswo Deutsch gelernt? Legen Sie den ASH-Einstufungstest (A2, B1, B2) ab, um im passenden Kurs am Annemarie-Schimmel-Haus Lahore einzusteigen.",
    eyebrow: "Einstufungstest",
    title: "Finden Sie Ihr genaues Niveau.",
    lead: "Wenn Sie anderswo Deutsch gelernt haben und in einen unserer fortgeschrittenen Kurse vor Ort oder online einsteigen möchten, ermittelt der Einstufungstest Ihre Kenntnisse und ordnet Sie dem passenden Kurs zu.",
    who: "Wer legt den Test ab?",
    whoText: "Nur externe Lernende, die noch nicht am Annemarie-Schimmel-Haus gelernt haben und kein offizielles Goethe-Zertifikat dieses Niveaus besitzen.",
    bring: "Original-CNIC mitbringen",
    bringText: "Ohne CNIC ist keine Teilnahme möglich.",
    fee: "Testgebühr",
    feeText: "Nicht erstattbar, zahlbar am Testtag am Empfang.",
    rights: "Das Hausrecht bleibt vorbehalten.",
    sessions: "Kommende Testtermine",
    none: "Der nächste Testtermin wird in Kürze veröffentlicht. Abonnieren Sie den Newsletter oder kontaktieren Sie uns.",
    formTitle: "Zum Test anmelden",
    formLead: "Dauert zwei Minuten. Sie erhalten eine Bestätigung mit allen Details per E-Mail.",
    session: "Testtermin",
    level: "Angestrebtes Niveau",
    prior: "Wo und wie lange haben Sie Deutsch gelernt?",
    priorHint: "z. B. „A1 und A2 an einer Sprachschule in Islamabad, 2025“",
    submit: "Zum Einstufungstest anmelden",
    deadline: "Anmeldeschluss",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: COPY[l].metaTitle, description: COPY[l].metaDescription, alternates: { canonical: `/${l}/placement-test` } };
}

export default async function PlacementPage() {
  const l = await locale();
  const t = COPY[l];
  const d = commonDictionary(l);
  const sessions = await getPlacementSessions();
  const fee = sessions[0]?.feePkr ?? 1100;

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.courses, href: href(l, "/courses") }, { label: t.eyebrow }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        image={{ src: "/images/gallery/ash-campus-learning-space-06.webp", alt: "", width: 1536, height: 967 }}
      >
        <div className="flex flex-wrap gap-2">
          {["A2", "B1", "B2"].map((lv) => (
            <span key={lv} className="rounded-2xl bg-forest px-5 py-3 font-mono text-xl font-semibold text-lime">
              {lv}
            </span>
          ))}
        </div>
      </PageHero>

      <section className="py-16 lg:py-24">
        <div className="container-site grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-5">
            <Reveal className="grid gap-3">
              {[
                { icon: Info, title: t.who, text: t.whoText },
                { icon: IdCard, title: t.bring, text: t.bringText },
                { icon: Wallet, title: `${t.fee}: ${formatPKR(fee, l)}`, text: t.feeText },
              ].map((i) => (
                <div key={i.title} className="flex gap-4 rounded-3xl bg-cream p-5 ring-1 ring-ink/10">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint text-pine">
                    <i.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-forest">{i.title}</p>
                    <p className="mt-1 text-sm text-stone">{i.text}</p>
                  </div>
                </div>
              ))}
              <p className="px-2 text-xs text-stone">{t.rights}</p>
            </Reveal>

            <Reveal delay={0.1} className="rounded-3xl bg-forest p-6 text-white">
              <p className="eyebrow text-lime">{t.sessions}</p>
              {sessions.length ? (
                <ul className="mt-4 grid gap-3">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
                      <DateBadge {...dateParts(s.startsAt, l)} tone="lime" />
                      <div className="text-sm">
                        <p className="font-semibold">
                          {formatClock(s.startsAt, l)}{l === "de" ? " bis " : " to "}{formatClock(s.endsAt, l)} · {s.levels.join(", ")}
                        </p>
                        <p className="text-white/70">
                          {t.deadline}: {formatDate(s.registrationDeadline, l, { weekday: "short", year: undefined })}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-lime">
                          <CircleCheck className="size-3.5" />
                          {s.state === "open" ? seatsLabel(d, s.seatsLeft) : s.state === "full" ? d.common.full : d.common.registrationClosed}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-white/70">{t.none}</p>
              )}
            </Reveal>
          </div>

          <Reveal delay={0.05} className="rounded-[2rem] bg-paper p-6 shadow-[0_30px_60px_-40px_rgb(16_36_28/0.6)] ring-1 ring-ink/10 sm:p-10">
            <h2 className="font-display text-3xl text-forest sm:text-4xl">{t.formTitle}</h2>
            <p className="mt-1 mb-8 text-stone">{t.formLead}</p>
            <PlacementForm
              locale={l}
              sessions={sessions.map((s) => ({
                id: s.id,
                label: formatDate(s.startsAt, l, { weekday: "long" }),
                meta: `${formatClock(s.startsAt, l)}${l === "de" ? " bis " : " to "}${formatClock(s.endsAt, l)} · ${s.levels.join(", ")} · ${t.deadline}: ${formatDate(s.registrationDeadline, l, { month: "short", year: undefined })}`,
                levels: s.levels,
                disabled: s.state !== "open",
                badge: s.state === "open" ? seatsLabel(d, s.seatsLeft) : s.state === "full" ? d.common.full : d.common.registrationClosed,
              }))}
              form={d.form}
              common={d.common}
              forms={formsCopy(l)}
              links={{ track: href(l, "/track"), privacy: href(l, "/privacy") }}
              labels={{ session: t.session, level: t.level, prior: t.prior, priorHint: t.priorHint, submit: t.submit }}
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
