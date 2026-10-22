import "server-only";
import type { Locale } from "@/i18n/config";
import type { WhatsAppTemplate } from "./whatsapp";

/**
 * Notification templates. Payloads are fully localised when the notification is
 * queued, so a retry renders exactly what the applicant was meant to receive.
 */
export type TemplatePayloads = {
  "enrollment.received": {
    name: string;
    reference: string;
    trackUrl: string;
    course: string;
    batch: string;
    schedule: string;
    startsOn: string;
    mode: string;
    amount: string;
    paymentInstructions: string;
    waitlisted: boolean;
  };
  "enrollment.status": {
    name: string;
    reference: string;
    trackUrl: string;
    course: string;
    status: string;
    statusLabel: string;
    startsOn: string;
    schedule: string;
    amount: string;
    paymentInstructions: string;
  };
  /** Acknowledges an applicant's "I have paid" report from the tracker. */
  "enrollment.payment_reported": { name: string; reference: string; trackUrl: string; course: string; paymentRef: string };
  "event.registered": {
    name: string;
    reference: string;
    trackUrl: string;
    event: string;
    when: string;
    venue: string;
    guests: number;
    requiresCnic: boolean;
    waitlisted: boolean;
    ics?: string;
  };
  "event.status": { name: string; reference: string; trackUrl: string; event: string; when: string; status: string; statusLabel: string };
  "placement.received": { name: string; reference: string; trackUrl: string; when: string; venue: string; fee: string; level: string; ics?: string };
  "placement.status": {
    name: string;
    reference: string;
    trackUrl: string;
    when: string;
    status: string;
    statusLabel: string;
    resultLevel?: string | null;
  };
  "contact.received": { name: string; reference: string; subject: string };
  "contact.reply": { name: string; reference: string; subject: string; body: string; staffName: string };
  /** Automatic reminders before an event, a placement test, a course start, or before the payment window ends. */
  "applicant.reminder": {
    kind: "event" | "placement" | "course" | "payment";
    name: string;
    reference: string;
    trackUrl: string;
    title: string;
    when: string;
    venue?: string;
    note?: string;
    amount?: string;
    paymentInstructions?: string;
    deadline?: string;
  };
  "staff.digest": { date: string; rows: [string, string][]; highlights: string[]; adminUrl: string };
  "staff.test": { name: string; sentAt: string };
  "newsletter.confirm": { confirmUrl: string };
  "staff.submission": { kind: string; reference: string; name: string; summary: string; adminUrl: string };
  "auth.reset": { name: string; url: string; minutes: number };
  "auth.invite": { name: string; url: string; inviter: string; role: string; hours: number };
};

export type TemplateKey = keyof TemplatePayloads;

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const nl2br = (v: string) => esc(v).replace(/\n/g, "<br>");

type Row = [label: string, value: string];
type Layout = {
  locale: Locale;
  preheader: string;
  title: string;
  greeting?: string;
  intro: string;
  reference?: { label: string; value: string };
  rows?: Row[];
  callout?: string;
  cta?: { label: string; url: string };
  outro?: string;
};

const T = {
  en: {
    tagline: "German Cultural Centre · Lahore",
    footer: "You receive this email because you contacted Annemarie-Schimmel-Haus. We will never ask you for passwords or card details by email or WhatsApp.",
    hello: "Dear",
    regards: "Warm regards,",
    team: "Your team at Annemarie-Schimmel-Haus",
    hours: "Mon-Fri 09:00 to 16:30",
    track: "Track your application",
    reference: "Application number",
    keep: "Keep this number, you need it for every enquiry.",
  },
  de: {
    tagline: "Deutsches Kulturzentrum · Lahore",
    footer: "Sie erhalten diese E-Mail, weil Sie das Annemarie-Schimmel-Haus kontaktiert haben. Wir fragen niemals per E-Mail oder WhatsApp nach Passwörtern oder Kartendaten.",
    hello: "Guten Tag",
    regards: "Herzliche Grüße",
    team: "Ihr Team des Annemarie-Schimmel-Hauses",
    hours: "Mo-Fr 09:00 bis 16:30",
    track: "Antrag verfolgen",
    reference: "Antragsnummer",
    keep: "Bitte bewahren Sie diese Nummer für alle Rückfragen auf.",
  },
} as const;

/** Contact details printed in every signature. Kept here (not in settings) so a queued email always renders the same. */
const CONTACT = {
  address: "155 Scotch Corner, Street 3, Upper Mall, Lahore 54000",
  phone: "+92 42 111 150 111",
  email: "info@schimmel.com.pk",
  whatsapp: "+92 310 4247822",
  social: [
    ["Facebook", "https://www.facebook.com/schimmel.lhr"],
    ["Instagram", "https://www.instagram.com/germancentrelhr"],
    ["YouTube", "https://www.youtube.com/@germancentrelhr"],
    ["LinkedIn", "https://www.linkedin.com/company/annemarie-schimmel-haus"],
  ] as [string, string][],
};

const appUrl = () => (process.env.APP_URL ?? "http://localhost:4000").replace(/\/$/, "");

/**
 * Brand layout: cream canvas, wordmark header, white card with a faint seal watermark,
 * reference panel, detail rows, call to action and a signature block. Table-based with
 * inline styles for Gmail/Outlook; the <style> block only adds dark-mode and phone tweaks
 * for clients that support it (Apple Mail, iOS, Outlook.com) and degrades cleanly elsewhere.
 */
function layout(l: Layout): { html: string; text: string } {
  const t = T[l.locale];
  const base = appUrl();
  const site = `${base}/${l.locale}`;
  const host = base.replace(/^https?:\/\//, "");
  const rows = (l.rows ?? [])
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td class="ash-muted ash-line" style="padding:11px 12px 11px 0;border-bottom:1px solid #ece8dc;color:#5b655d;font-size:13px;width:36%;vertical-align:top">${esc(k)}</td><td class="ash-text ash-line" style="padding:11px 0;border-bottom:1px solid #ece8dc;color:#25302b;font-size:14px;font-weight:600;line-height:1.5">${nl2br(v)}</td></tr>`,
    )
    .join("");
  const social = CONTACT.social
    .map(([name, href]) => `<a href="${esc(href)}" style="color:#477748;text-decoration:none;font-weight:600">${name}</a>`)
    .join(`<span style="color:#c9c6b8"> &nbsp;·&nbsp; </span>`);
  const html = `<!doctype html><html lang="${l.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(l.title)}</title>
<style>
.ash-dark-only{display:none;max-height:0;overflow:hidden}
@media (max-width:520px){.ash-card{padding:26px 20px!important}.ash-h1{font-size:23px!important}.ash-ref{font-size:21px!important}}
@media (prefers-color-scheme:dark){
body,.ash-canvas{background:#0c1611!important}
.ash-card{background-color:#122019!important}
.ash-text,.ash-h1{color:#e3eae1!important}
.ash-muted{color:#a9b5ac!important}
.ash-line{border-color:#22352b!important}
.ash-panel{background:#172820!important}
.ash-callout{background:#15241c!important}
.ash-light-only{display:none!important}
.ash-dark-only{display:block!important;max-height:none!important}
}
</style></head>
<body class="ash-canvas" style="margin:0;padding:0;background:#f7f3e9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#25302b;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(l.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" class="ash-canvas" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3e9"><tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 6px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><a href="${esc(site)}" style="text-decoration:none"><img class="ash-light-only" src="${base}/email/wordmark.png" width="150" alt="Annemarie-Schimmel-Haus" style="display:block;width:150px;height:auto;border:0"><div class="ash-dark-only"><img src="${base}/email/wordmark-light.png" width="150" alt="Annemarie-Schimmel-Haus" style="display:block;width:150px;height:auto;border:0"></div></a></td>
<td align="right" class="ash-muted" style="vertical-align:middle;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#477748;font-weight:600">${esc(t.tagline)}</td>
</tr></table></td></tr>
<tr><td style="font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="72%" style="height:5px;background:#477748;border-radius:18px 0 0 0"></td><td width="28%" style="height:5px;background:#92c83e;border-radius:0 18px 0 0"></td></tr></table></td></tr>
<tr><td class="ash-card" background="${base}/email/watermark.png" style="background-color:#ffffff;background-image:url('${base}/email/watermark.png');background-repeat:no-repeat;background-position:right -110px bottom -120px;border-radius:0 0 18px 18px;padding:34px 30px 30px;box-shadow:0 1px 2px rgba(16,36,28,.06)">
<h1 class="ash-h1" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:27px;line-height:1.25;color:#10241c">${esc(l.title)}</h1>
${l.greeting ? `<p class="ash-text" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#25302b">${esc(t.hello)} ${esc(l.greeting)},</p>` : ""}
<p class="ash-text" style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#25302b">${nl2br(l.intro)}</p>
${
  l.reference
    ? `<table role="presentation" class="ash-panel" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2e8;border-radius:14px;margin:0 0 22px"><tr><td style="padding:16px 18px"><div class="ash-muted" style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#1f5f39;font-weight:600">${esc(l.reference.label)}</div><div class="ash-ref ash-text" style="font-family:Consolas,Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:2px;color:#10241c;margin-top:4px">${esc(l.reference.value)}</div><div class="ash-muted" style="font-size:12px;color:#5b655d;margin-top:4px">${esc(t.keep)}</div></td></tr></table>`
    : ""
}
${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${rows}</table>` : ""}
${l.callout ? `<table role="presentation" class="ash-callout" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf9f2;border-left:4px solid #92c83e;border-radius:10px;margin:0 0 24px"><tr><td class="ash-text" style="padding:14px 16px;font-size:14px;line-height:1.65;color:#25302b">${nl2br(l.callout)}</td></tr></table>` : ""}
${
  l.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:2px 0 24px"><tr><td style="background:#477748;border-radius:999px"><a href="${esc(l.cta.url)}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:999px">${esc(l.cta.label)} &rarr;</a></td></tr></table>`
    : ""
}
${l.outro ? `<p class="ash-muted" style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#3d4842">${nl2br(l.outro)}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px"><tr><td class="ash-line" style="border-top:1px solid #ece8dc;padding-top:20px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:14px"><img src="${base}/email/seal.png" width="44" height="44" alt="" style="display:block;border:0;border-radius:11px"></td>
<td style="vertical-align:top">
<div class="ash-muted" style="font-size:14px;color:#3d4842">${esc(t.regards)}</div>
<div class="ash-text" style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#10241c;margin-top:2px">${esc(t.team)}</div>
<div class="ash-muted" style="font-size:12px;line-height:1.7;color:#5b655d;margin-top:6px">${esc(CONTACT.phone)} &nbsp;·&nbsp; WhatsApp ${esc(CONTACT.whatsapp)}<br><a href="mailto:${CONTACT.email}" style="color:#477748;text-decoration:none">${CONTACT.email}</a> &nbsp;·&nbsp; <a href="${esc(site)}" style="color:#477748;text-decoration:none">${esc(host)}</a><br>${esc(t.hours)}</div>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:22px 10px 0;font-size:12px;line-height:1.7;color:#6b756d">
<div style="margin-bottom:8px">${social}</div>
<div class="ash-muted">${esc(CONTACT.address)}</div>
<div class="ash-muted" style="margin-top:6px;color:#8a938b">${esc(t.footer)}</div>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `ANNEMARIE-SCHIMMEL-HAUS · ${t.tagline}`,
    "",
    l.title,
    "",
    l.greeting ? `${t.hello} ${l.greeting},` : "",
    l.intro,
    "",
    l.reference ? `${l.reference.label}: ${l.reference.value}` : "",
    ...(l.rows ?? []).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    l.callout ?? "",
    l.cta ? `${l.cta.label}: ${l.cta.url}` : "",
    l.outro ?? "",
    "",
    "·",
    t.regards,
    t.team,
    `${CONTACT.phone} · WhatsApp ${CONTACT.whatsapp} · ${CONTACT.email}`,
    `${site} · ${t.hours}`,
    CONTACT.address,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
  return { html, text };
}

export type RenderedEmail = { subject: string; html: string; text: string; attachments?: { filename: string; contentType: string; content: string }[] };

export function renderEmail<K extends TemplateKey>(key: K, p: TemplatePayloads[K], locale: Locale): RenderedEmail {
  const de = locale === "de";
  const t = T[locale];
  switch (key) {
    case "enrollment.received": {
      const d = p as TemplatePayloads["enrollment.received"];
      const subject = d.waitlisted
        ? de ? `Warteliste: ${d.course} (${d.reference})` : `You're on the waitlist: ${d.course} (${d.reference})`
        : de ? `Anmeldung eingegangen: ${d.course} (${d.reference})` : `Application received: ${d.course} (${d.reference})`;
      return {
        subject,
        ...layout({
          locale,
          preheader: de ? `Ihre Antragsnummer: ${d.reference}` : `Your application number: ${d.reference}`,
          title: d.waitlisted ? (de ? "Sie stehen auf der Warteliste" : "You're on the waitlist") : de ? "Vielen Dank für Ihre Anmeldung" : "Thank you for your application",
          greeting: d.name,
          intro: d.waitlisted
            ? de
              ? `Der Kurs ${d.course} ist derzeit ausgebucht. Wir haben Sie auf die Warteliste gesetzt und melden uns, sobald ein Platz frei wird.`
              : `${d.course} is currently fully booked. We've added you to the waitlist and will contact you as soon as a seat becomes available.`
            : de
              ? `wir haben Ihre Anmeldung für ${d.course} erhalten und einen Platz für Sie reserviert. Bitte bewahren Sie Ihre Antragsnummer auf, damit können Sie den Status jederzeit verfolgen.`
              : `we have received your application for ${d.course} and reserved a seat for you. Please keep your application number, you can use it to track your status at any time.`,
          reference: { label: t.reference, value: d.reference },
          rows: [
            [de ? "Kurs" : "Course", d.course],
            [de ? "Gruppe" : "Batch", d.batch],
            [de ? "Beginn" : "Starts", d.startsOn],
            [de ? "Zeitplan" : "Schedule", d.schedule],
            [de ? "Format" : "Format", d.mode],
            [de ? "Kursgebühr" : "Course fee", d.amount],
          ],
          callout: d.waitlisted ? undefined : `${de ? "Nächste Schritte" : "Next steps"}\n${d.paymentInstructions}`,
          cta: { label: t.track, url: d.trackUrl },
        }),
      };
    }
    case "enrollment.status": {
      const d = p as TemplatePayloads["enrollment.status"];
      const messages: Record<string, { en: string; de: string }> = {
        payment_pending: {
          en: `your application for ${d.course} has been reviewed. Please complete the payment of ${d.amount} to confirm your seat.`,
          de: `Ihre Anmeldung für ${d.course} wurde geprüft. Bitte zahlen Sie ${d.amount}, um Ihren Platz zu bestätigen.`,
        },
        confirmed: {
          en: `your seat in ${d.course} is confirmed. We look forward to welcoming you on ${d.startsOn} (${d.schedule}).`,
          de: `Ihr Platz in ${d.course} ist bestätigt. Wir freuen uns, Sie am ${d.startsOn} (${d.schedule}) begrüßen zu dürfen.`,
        },
        waitlisted: {
          en: `${d.course} is fully booked at the moment, so your application is on the waitlist. We will contact you if a seat becomes free.`,
          de: `${d.course} ist derzeit ausgebucht, daher steht Ihre Anmeldung auf der Warteliste. Wir melden uns, sobald ein Platz frei wird.`,
        },
        rejected: {
          en: `unfortunately we cannot offer you a place in ${d.course}. Our course office will be happy to suggest a suitable alternative.`,
          de: `leider können wir Ihnen keinen Platz in ${d.course} anbieten. Unser Kursbüro schlägt Ihnen gern eine passende Alternative vor.`,
        },
        cancelled: {
          en: `your application for ${d.course} has been cancelled. If this is unexpected, please contact our course office.`,
          de: `Ihre Anmeldung für ${d.course} wurde storniert. Falls dies unerwartet ist, wenden Sie sich bitte an unser Kursbüro.`,
        },
        completed: {
          en: `congratulations on completing ${d.course}! Your digital certificate will follow by email.`,
          de: `herzlichen Glückwunsch zum Abschluss von ${d.course}! Ihr digitales Zertifikat folgt per E-Mail.`,
        },
      };
      const msg = messages[d.status] ?? { en: `the status of your application is now: ${d.statusLabel}.`, de: `der Status Ihres Antrags lautet jetzt: ${d.statusLabel}.` };
      return {
        subject: de ? `${d.statusLabel}: ${d.course} (${d.reference})` : `${d.statusLabel}: ${d.course} (${d.reference})`,
        ...layout({
          locale,
          preheader: d.statusLabel,
          title: d.statusLabel,
          greeting: d.name,
          intro: msg[locale],
          reference: { label: t.reference, value: d.reference },
          rows: [
            [de ? "Kurs" : "Course", d.course],
            [de ? "Beginn" : "Starts", d.startsOn],
            [de ? "Zeitplan" : "Schedule", d.schedule],
          ],
          callout: d.status === "payment_pending" ? d.paymentInstructions : undefined,
          cta: { label: t.track, url: d.trackUrl },
        }),
      };
    }
    case "enrollment.payment_reported": {
      const d = p as TemplatePayloads["enrollment.payment_reported"];
      return {
        subject: de ? `Zahlungsmeldung erhalten: ${d.course} (${d.reference})` : `Payment report received: ${d.course} (${d.reference})`,
        ...layout({
          locale,
          preheader: de ? "Wir prüfen Ihre Zahlung und bestätigen dann Ihren Platz." : "We are checking your payment and will then confirm your seat.",
          title: de ? "Danke, wir prüfen Ihre Zahlung" : "Thank you, we are checking your payment",
          greeting: d.name,
          intro: de
            ? `wir haben Ihre Zahlungsmeldung für ${d.course} erhalten. Unser Kursbüro gleicht sie mit dem Kontoauszug ab (in der Regel innerhalb eines Werktags) und bestätigt dann Ihren Platz per E-Mail und WhatsApp.`
            : `we have received your payment report for ${d.course}. Our course office matches it with the bank statement (usually within one working day) and then confirms your seat by email and WhatsApp.`,
          reference: { label: t.reference, value: d.reference },
          rows: [
            [de ? "Kurs" : "Course", d.course],
            [de ? "Transaktionsnummer" : "Transaction reference", d.paymentRef],
          ],
          cta: { label: t.track, url: d.trackUrl },
        }),
      };
    }
    case "event.registered": {
      const d = p as TemplatePayloads["event.registered"];
      return {
        subject: d.waitlisted ? (de ? `Warteliste: ${d.event}` : `Waitlist: ${d.event}`) : de ? `Ihre Anmeldung: ${d.event}` : `You're registered: ${d.event}`,
        ...layout({
          locale,
          preheader: `${d.when} · ${d.venue}`,
          title: d.waitlisted ? (de ? "Sie stehen auf der Warteliste" : "You're on the waitlist") : de ? "Wir sehen uns!" : "See you there!",
          greeting: d.name,
          intro: d.waitlisted
            ? de
              ? `Die Veranstaltung „${d.event}" ist ausgebucht. Wir haben Sie auf die Warteliste gesetzt und informieren Sie, sobald ein Platz frei wird.`
              : `"${d.event}" is fully booked. You're on the waitlist and we'll let you know as soon as a seat opens up.`
            : de
              ? `Ihre Anmeldung für „${d.event}" ist bestätigt. Zeigen Sie am Eingang einfach Ihre Antragsnummer vor.`
              : `your registration for "${d.event}" is confirmed. Simply show your application number at the entrance.`,
          reference: { label: de ? "Ticketnummer" : "Ticket number", value: d.reference },
          rows: [
            [de ? "Wann" : "When", d.when],
            [de ? "Wo" : "Where", d.venue],
            [de ? "Begleitpersonen" : "Guests", d.guests ? String(d.guests) : ""],
          ],
          callout: d.requiresCnic
            ? de
              ? "Bitte bringen Sie Ihre Original-CNIC mit, ohne sie ist kein Einlass möglich."
              : "Please bring your original CNIC, entry is not possible without it."
            : undefined,
          cta: { label: t.track, url: d.trackUrl },
        }),
        attachments: d.ics && !d.waitlisted ? [{ filename: "event.ics", contentType: "text/calendar; charset=UTF-8; method=PUBLISH", content: d.ics }] : undefined,
      };
    }
    case "event.status": {
      const d = p as TemplatePayloads["event.status"];
      return {
        subject: `${d.statusLabel}: ${d.event}`,
        ...layout({
          locale,
          preheader: d.statusLabel,
          title: d.statusLabel,
          greeting: d.name,
          intro:
            d.status === "registered"
              ? de
                ? `gute Nachrichten, für „${d.event}" ist ein Platz für Sie frei geworden. Ihre Anmeldung ist bestätigt.`
                : `good news, a seat has opened up for "${d.event}". Your registration is now confirmed.`
              : de
                ? `der Status Ihrer Anmeldung für „${d.event}" lautet jetzt: ${d.statusLabel}.`
                : `the status of your registration for "${d.event}" is now: ${d.statusLabel}.`,
          reference: { label: de ? "Ticketnummer" : "Ticket number", value: d.reference },
          rows: [[de ? "Wann" : "When", d.when]],
          cta: { label: t.track, url: d.trackUrl },
        }),
      };
    }
    case "placement.received": {
      const d = p as TemplatePayloads["placement.received"];
      return {
        subject: de ? `Einstufungstest: Anmeldung ${d.reference}` : `Placement test registration ${d.reference}`,
        ...layout({
          locale,
          preheader: d.when,
          title: de ? "Ihr Einstufungstest" : "Your placement test",
          greeting: d.name,
          intro: de
            ? "vielen Dank für Ihre Anmeldung zum ASH-Einstufungstest. Hier sind alle Details:"
            : "thank you for registering for the ASH placement test. Here are your details:",
          reference: { label: t.reference, value: d.reference },
          rows: [
            [de ? "Termin" : "Date & time", d.when],
            [de ? "Ort" : "Venue", d.venue],
            [de ? "Angestrebtes Niveau" : "Target level", d.level],
            [de ? "Testgebühr" : "Test fee", d.fee],
          ],
          callout: de
            ? "Bitte bringen Sie Ihre Original-CNIC mit, ohne sie ist keine Teilnahme möglich. Die Testgebühr wird nicht erstattet."
            : "Please bring your original CNIC, you will not be admitted without it. The test fee is non-refundable.",
          cta: { label: t.track, url: d.trackUrl },
        }),
        attachments: d.ics ? [{ filename: "placement-test.ics", contentType: "text/calendar; charset=UTF-8; method=PUBLISH", content: d.ics }] : undefined,
      };
    }
    case "placement.status": {
      const d = p as TemplatePayloads["placement.status"];
      const result = d.status === "completed" && d.resultLevel;
      return {
        subject: `${d.statusLabel} (${d.reference})`,
        ...layout({
          locale,
          preheader: d.statusLabel,
          title: result ? (de ? "Ihr Testergebnis" : "Your test result") : d.statusLabel,
          greeting: d.name,
          intro: result
            ? de
              ? `Ihr Einstufungstest ist ausgewertet. Empfohlen wird ein Einstieg auf Niveau ${d.resultLevel}. Sie können sich jetzt für einen passenden Kurs anmelden.`
              : `your placement test has been evaluated. We recommend joining at level ${d.resultLevel}. You can now apply for a matching course.`
            : de
              ? `der Status Ihres Einstufungstests lautet jetzt: ${d.statusLabel}.`
              : `the status of your placement test is now: ${d.statusLabel}.`,
          reference: { label: t.reference, value: d.reference },
          rows: [[de ? "Termin" : "Date & time", d.when]],
          cta: { label: t.track, url: d.trackUrl },
        }),
      };
    }
    case "contact.received": {
      const d = p as TemplatePayloads["contact.received"];
      return {
        subject: de ? `Wir haben Ihre Nachricht erhalten (${d.reference})` : `We received your message (${d.reference})`,
        ...layout({
          locale,
          preheader: d.subject,
          title: de ? "Danke für Ihre Nachricht" : "Thank you for your message",
          greeting: d.name,
          intro: de
            ? `wir haben Ihre Nachricht „${d.subject}" erhalten und antworten in der Regel innerhalb von zwei Werktagen.`
            : `we have received your message "${d.subject}" and usually reply within two working days.`,
          reference: { label: de ? "Referenz" : "Reference", value: d.reference },
        }),
      };
    }
    case "contact.reply": {
      const d = p as TemplatePayloads["contact.reply"];
      return {
        subject: `Re: ${d.subject} (${d.reference})`,
        ...layout({
          locale,
          preheader: d.body.slice(0, 120),
          title: de ? "Antwort auf Ihre Nachricht" : "Reply to your message",
          greeting: d.name,
          intro: d.body,
          reference: { label: de ? "Referenz" : "Reference", value: d.reference },
          outro: `${d.staffName} · Annemarie-Schimmel-Haus`,
        }),
      };
    }
    case "applicant.reminder": {
      const d = p as TemplatePayloads["applicant.reminder"];
      const copy = {
        event: {
          subject: de ? `Erinnerung: ${d.title} · ${d.when}` : `Reminder: ${d.title} · ${d.when}`,
          title: de ? "Bis bald!" : "See you soon!",
          intro: de ? `eine kurze Erinnerung: „${d.title}" beginnt ${d.when}. Ihre Ticketnummer genügt am Eingang.` : `a quick reminder: "${d.title}" starts ${d.when}. Your ticket number is all you need at the entrance.`,
        },
        placement: {
          subject: de ? `Erinnerung: Einstufungstest ${d.when}` : `Reminder: placement test ${d.when}`,
          title: de ? "Ihr Einstufungstest" : "Your placement test",
          intro: de
            ? `Ihr Einstufungstest findet ${d.when} statt. Bitte kommen Sie 15 Minuten früher und bringen Sie Ihre Original-CNIC und die Testgebühr mit.`
            : `your placement test is ${d.when}. Please arrive 15 minutes early and bring your original CNIC and the test fee.`,
        },
        course: {
          subject: de ? `Ihr Kurs beginnt bald: ${d.title}` : `Your course starts soon: ${d.title}`,
          title: de ? "Willkommen im Kurs!" : "Welcome to your course!",
          intro: de
            ? `Ihr Kurs ${d.title} beginnt ${d.when}. Bitte kommen Sie am ersten Tag 10 Minuten früher. Wir freuen uns auf Sie!`
            : `your course ${d.title} starts ${d.when}. Please arrive 10 minutes early on the first day. We look forward to meeting you!`,
        },
        payment: {
          subject: de ? `Zahlungserinnerung: ${d.title} (${d.reference})` : `Payment reminder: ${d.title} (${d.reference})`,
          title: de ? "Ihr Platz ist noch reserviert" : "Your seat is still reserved",
          intro: de
            ? `wir halten Ihren Platz in ${d.title} noch bis ${d.deadline} für Sie frei. Bitte zahlen Sie ${d.amount} und melden Sie die Transaktionsnummer über „Antrag verfolgen", damit wir Ihren Platz bestätigen können.`
            : `we are holding your seat in ${d.title} until ${d.deadline}. Please pay ${d.amount} and report the transaction reference via "Track your application" so we can confirm your seat.`,
        },
      }[d.kind];
      return {
        subject: copy.subject,
        ...layout({
          locale,
          preheader: copy.subject,
          title: copy.title,
          greeting: d.name,
          intro: copy.intro,
          reference: { label: d.kind === "event" ? (de ? "Ticketnummer" : "Ticket number") : t.reference, value: d.reference },
          rows: [
            [de ? "Wann" : "When", d.when],
            [de ? "Wo" : "Where", d.venue ?? ""],
            [de ? "Betrag" : "Amount", d.kind === "payment" ? (d.amount ?? "") : ""],
          ],
          callout: d.kind === "payment" ? d.paymentInstructions : d.note,
          cta: { label: t.track, url: d.trackUrl },
        }),
      };
    }
    case "staff.digest": {
      const d = p as TemplatePayloads["staff.digest"];
      return {
        subject: `[ASH] Today at the Haus: ${d.date}`,
        ...layout({
          locale: "en",
          preheader: d.highlights[0] ?? "Your daily overview",
          title: "Good morning!",
          intro: d.highlights.length ? d.highlights.join("\n") : "Nothing needs your attention today. Enjoy the quiet!",
          rows: d.rows,
          cta: { label: "Open the admin", url: d.adminUrl },
          outro: "Sent automatically every working day. Turn it off under Admin → Settings → Automation.",
        }),
      };
    }
    case "staff.test": {
      const d = p as TemplatePayloads["staff.test"];
      return {
        subject: "[ASH] Test email from the admin",
        ...layout({
          locale: "en",
          preheader: "Gmail delivery works.",
          title: "Email delivery works",
          greeting: d.name,
          intro: `this test was sent from the ASH admin at ${d.sentAt}. Applicants will receive their confirmations from this address.`,
        }),
      };
    }
    case "newsletter.confirm": {
      const d = p as TemplatePayloads["newsletter.confirm"];
      return {
        subject: de ? "Bitte bestätigen Sie Ihr Newsletter-Abonnement" : "Please confirm your newsletter subscription",
        ...layout({
          locale,
          preheader: de ? "Ein Klick genügt." : "One click and you're in.",
          title: de ? "Fast geschafft!" : "Almost there!",
          intro: de
            ? "Bitte bestätigen Sie Ihre E-Mail-Adresse, um Neuigkeiten zu Kursen, Veranstaltungen und Stipendien zu erhalten. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail einfach."
            : "Please confirm your email address to receive news about courses, events and scholarships. If you didn't sign up, simply ignore this email.",
          cta: { label: de ? "Abonnement bestätigen" : "Confirm subscription", url: d.confirmUrl },
        }),
      };
    }
    case "staff.submission": {
      const d = p as TemplatePayloads["staff.submission"];
      return {
        subject: `[ASH] ${d.kind}: ${d.reference}: ${d.name}`,
        ...layout({
          locale: "en",
          preheader: d.summary,
          title: `New ${d.kind.toLowerCase()}`,
          intro: d.summary,
          reference: { label: "Reference", value: d.reference },
          cta: { label: "Open in admin", url: d.adminUrl },
        }),
      };
    }
    case "auth.reset": {
      const d = p as TemplatePayloads["auth.reset"];
      return {
        subject: "Reset your ASH admin password",
        ...layout({
          locale: "en",
          preheader: `This link expires in ${d.minutes} minutes.`,
          title: "Reset your password",
          greeting: d.name,
          intro: `use the button below to choose a new password. The link works once and expires in ${d.minutes} minutes. If you did not request this, you can ignore this email, your password stays unchanged.`,
          cta: { label: "Choose a new password", url: d.url },
        }),
      };
    }
    case "auth.invite": {
      const d = p as TemplatePayloads["auth.invite"];
      return {
        subject: "You're invited to the ASH admin",
        ...layout({
          locale: "en",
          preheader: `${d.inviter} invited you as ${d.role}.`,
          title: "Welcome to the team",
          greeting: d.name,
          intro: `${d.inviter} invited you to the Annemarie-Schimmel-Haus admin as ${d.role}. Set your password to activate your account. The link expires in ${d.hours} hours.`,
          cta: { label: "Activate my account", url: d.url },
        }),
      };
    }
  }
  throw new Error(`Unknown email template ${key}`);
}

/**
 * WhatsApp template mapping. Templates must be created with exactly these
 * names, languages (en, de) and body variables in Meta Business Manager.
 */
export function whatsappTemplate<K extends TemplateKey>(key: K, p: TemplatePayloads[K], locale: Locale): WhatsAppTemplate | null {
  const t = whatsappBody(key, p, locale);
  // Every applicant template has a "Track application" URL button ending in ?ref={{1}}.
  const reference = (p as { reference?: string }).reference;
  return t && reference ? { ...t, buttonUrlSuffix: reference } : t;
}

function whatsappBody<K extends TemplateKey>(key: K, p: TemplatePayloads[K], locale: Locale): WhatsAppTemplate | null {
  const language = locale === "de" ? "de" : "en";
  switch (key) {
    case "enrollment.received": {
      const d = p as TemplatePayloads["enrollment.received"];
      return { name: "ash_application_received", language, params: [d.name, d.reference, d.course] };
    }
    case "enrollment.status": {
      const d = p as TemplatePayloads["enrollment.status"];
      return { name: "ash_application_status", language, params: [d.name, d.reference, d.course, d.statusLabel] };
    }
    case "enrollment.payment_reported": {
      const d = p as TemplatePayloads["enrollment.payment_reported"];
      return { name: "ash_application_status", language, params: [d.name, d.reference, d.course, language === "de" ? "Zahlung wird geprüft" : "Payment being checked"] };
    }
    case "event.registered": {
      const d = p as TemplatePayloads["event.registered"];
      return { name: "ash_event_registration", language, params: [d.name, d.event, d.when, d.reference] };
    }
    case "event.status": {
      const d = p as TemplatePayloads["event.status"];
      return { name: "ash_application_status", language, params: [d.name, d.reference, d.event, d.statusLabel] };
    }
    case "placement.received": {
      const d = p as TemplatePayloads["placement.received"];
      return { name: "ash_placement_registration", language, params: [d.name, d.when, d.reference] };
    }
    case "placement.status": {
      const d = p as TemplatePayloads["placement.status"];
      return { name: "ash_application_status", language, params: [d.name, d.reference, language === "de" ? "Einstufungstest" : "Placement test", d.statusLabel] };
    }
    case "applicant.reminder": {
      // Re-uses the approved status template, so no extra Meta approval is needed.
      const d = p as TemplatePayloads["applicant.reminder"];
      const label = {
        event: language === "de" ? `Erinnerung: ${d.when}` : `Reminder: ${d.when}`,
        placement: language === "de" ? `Erinnerung: Test ${d.when}` : `Reminder: test ${d.when}`,
        course: language === "de" ? `Kursbeginn ${d.when}` : `Course starts ${d.when}`,
        payment: language === "de" ? `Bitte zahlen bis ${d.deadline}` : `Please pay by ${d.deadline}`,
      }[d.kind];
      return { name: "ash_application_status", language, params: [d.name, d.reference, d.title, label] };
    }
    default:
      return null;
  }
}
