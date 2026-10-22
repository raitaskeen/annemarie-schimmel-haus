import type { Locale } from "@/i18n/config";

export type LegalPage = { meta: string; title: string; lead: string; updated: string; sections: { heading: string; body: string[] }[] };

/**
 * Policy texts. They describe how this platform actually processes data and
 * should be reviewed by the institute's legal adviser before launch.
 */
const privacy: Record<Locale, LegalPage> = {
  en: {
    meta: "Privacy notice",
    title: "Privacy notice",
    lead: "How Annemarie-Schimmel-Haus handles the personal data you share with us through this website.",
    updated: "Last updated: October 2026",
    sections: [
      { heading: "Who is responsible", body: ["Annemarie-Schimmel-Haus, 155 Scotch Corner, Street 3, Upper Mall, Lahore 54000, Pakistan · info@schimmel.com.pk · +92 42 111 150 111."] },
      {
        heading: "What we collect and why",
        body: [
          "Course applications: identity details (name, father's/husband's name, CNIC/B-Form, date and place of birth), contact details, emergency contact, education, address, motivation and the documents you upload. We use them to assess your application, place you in a course, issue certificates and contact you.",
          "Event registrations and placement tests: name, contact details and — where entry requires it — your CNIC, to manage seats, admission and results.",
          "Contact messages and newsletter: the details you send us, to answer your enquiry or send the newsletter you confirmed.",
        ],
      },
      {
        heading: "Notifications",
        body: [
          "We send confirmations and status updates by email (sent through Google Workspace / Gmail) and — only if you opt in — by WhatsApp (sent through the WhatsApp Business Platform by Meta). These providers process your contact details solely to deliver our messages.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Data travels encrypted (HTTPS). Uploaded documents are re-encoded, stored privately and are visible only to authorised staff. Staff accounts are protected by strong passwords and two-factor authentication, and every administrative action is logged.",
          "Our public forms use a privacy-friendly human check and rate limits instead of third-party tracking. We do not use advertising or analytics cookies.",
        ],
      },
      {
        heading: "How long we keep data",
        body: [
          "Applications that did not lead to enrolment: 12 months. Course and certificate records: up to 5 years. Event registrations: 12 months after the event. Contact messages: 24 months. Newsletter: until you unsubscribe. Identity documents are deleted when they are no longer needed for your course.",
        ],
      },
      { heading: "Your rights", body: ["You can ask for a copy of your data, its correction or deletion, and withdraw consent for WhatsApp messages or the newsletter at any time by writing to info@schimmel.com.pk."] },
    ],
  },
  de: {
    meta: "Datenschutzhinweis",
    title: "Datenschutzhinweis",
    lead: "Wie das Annemarie-Schimmel-Haus mit den personenbezogenen Daten umgeht, die Sie uns über diese Website mitteilen.",
    updated: "Stand: Oktober 2026",
    sections: [
      { heading: "Verantwortlich", body: ["Annemarie-Schimmel-Haus, 155 Scotch Corner, Street 3, Upper Mall, Lahore 54000, Pakistan · info@schimmel.com.pk · +92 42 111 150 111."] },
      {
        heading: "Welche Daten wir erheben und warum",
        body: [
          "Kursanmeldungen: Identitätsdaten (Name, Name des Vaters/Ehemanns, CNIC/B-Form, Geburtsdatum und -ort), Kontaktdaten, Notfallkontakt, Bildung, Adresse, Motivation und hochgeladene Dokumente. Wir nutzen sie zur Prüfung Ihrer Anmeldung, zur Einstufung, für Zertifikate und zur Kontaktaufnahme.",
          "Veranstaltungen und Einstufungstests: Name, Kontaktdaten und — wo der Einlass es erfordert — Ihre CNIC, um Plätze, Einlass und Ergebnisse zu verwalten.",
          "Kontaktanfragen und Newsletter: die von Ihnen gesendeten Angaben, um Ihre Anfrage zu beantworten oder den bestätigten Newsletter zu senden.",
        ],
      },
      { heading: "Benachrichtigungen", body: ["Bestätigungen und Statusmeldungen senden wir per E-Mail (über Google Workspace / Gmail) und — nur mit Ihrer Zustimmung — per WhatsApp (über die WhatsApp Business Platform von Meta). Diese Anbieter verarbeiten Ihre Kontaktdaten ausschließlich zur Zustellung unserer Nachrichten."] },
      {
        heading: "Sicherheit",
        body: [
          "Daten werden verschlüsselt übertragen (HTTPS). Hochgeladene Dokumente werden neu kodiert, vertraulich gespeichert und sind nur für berechtigte Mitarbeitende sichtbar. Mitarbeiterkonten sind durch starke Passwörter und Zwei-Faktor-Authentifizierung geschützt; jede Verwaltungsaktion wird protokolliert.",
          "Unsere Formulare nutzen eine datenschutzfreundliche Prüffrage und Ratenbegrenzung statt Tracking durch Dritte. Wir verwenden keine Werbe- oder Analyse-Cookies.",
        ],
      },
      { heading: "Speicherdauer", body: ["Anmeldungen ohne Kursteilnahme: 12 Monate. Kurs- und Zertifikatsdaten: bis zu 5 Jahre. Veranstaltungsanmeldungen: 12 Monate nach der Veranstaltung. Kontaktanfragen: 24 Monate. Newsletter: bis zur Abmeldung. Ausweisdokumente werden gelöscht, sobald sie für Ihren Kurs nicht mehr benötigt werden."] },
      { heading: "Ihre Rechte", body: ["Sie können jederzeit Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen und Ihre Einwilligung zu WhatsApp-Nachrichten oder zum Newsletter widerrufen: info@schimmel.com.pk."] },
    ],
  },
};

const terms: Record<Locale, LegalPage> = {
  en: {
    meta: "Terms of use",
    title: "Terms of use",
    lead: "The rules that apply when you use this website and register for our courses, tests and events.",
    updated: "Last updated: October 2026",
    sections: [
      { heading: "Applications and seats", body: ["Submitting a course application reserves a seat provisionally. The seat is confirmed once our course office has reviewed your application and received the course fee within the stated payment window. Unpaid reservations may be released."] },
      { heading: "Fees", body: ["Course fees and book charges are listed on the course pages. Books are charged separately; courier charges apply for delivery. The placement test fee is non-refundable."] },
      { heading: "Events", body: ["Registration for free events reserves a seat on a first-come, first-served basis. Where indicated, entry requires your original CNIC. Rights of admission are reserved."] },
      { heading: "Goethe-Institut exams", body: ["Exam registration and payment are handled exclusively by the Goethe-Institut via its official portal. Their terms apply."] },
      { heading: "Content", body: ["Texts, photographs and logos on this website belong to Annemarie-Schimmel-Haus or its partners and may not be reused without permission."] },
      { heading: "Contact", body: ["Questions about these terms: info@schimmel.com.pk."] },
    ],
  },
  de: {
    meta: "Nutzungsbedingungen",
    title: "Nutzungsbedingungen",
    lead: "Die Regeln für die Nutzung dieser Website und die Anmeldung zu unseren Kursen, Tests und Veranstaltungen.",
    updated: "Stand: Oktober 2026",
    sections: [
      { heading: "Anmeldungen und Plätze", body: ["Mit dem Absenden einer Kursanmeldung wird ein Platz vorläufig reserviert. Bestätigt ist der Platz, sobald unser Kursbüro die Anmeldung geprüft hat und die Kursgebühr innerhalb der genannten Frist eingegangen ist. Unbezahlte Reservierungen können freigegeben werden."] },
      { heading: "Gebühren", body: ["Kursgebühren und Buchkosten stehen auf den Kursseiten. Bücher werden separat berechnet; für den Versand fallen Kosten an. Die Gebühr für den Einstufungstest wird nicht erstattet."] },
      { heading: "Veranstaltungen", body: ["Die Anmeldung zu kostenlosen Veranstaltungen reserviert einen Platz nach Eingang. Wo angegeben, ist für den Einlass die Original-CNIC erforderlich. Das Hausrecht bleibt vorbehalten."] },
      { heading: "Goethe-Prüfungen", body: ["Anmeldung und Zahlung erfolgen ausschließlich über das offizielle Portal des Goethe-Instituts. Es gelten dessen Bedingungen."] },
      { heading: "Inhalte", body: ["Texte, Fotos und Logos dieser Website gehören dem Annemarie-Schimmel-Haus oder seinen Partnern und dürfen nicht ohne Erlaubnis verwendet werden."] },
      { heading: "Kontakt", body: ["Fragen zu diesen Bedingungen: info@schimmel.com.pk."] },
    ],
  },
};

const guidelines: Record<Locale, LegalPage> = {
  en: {
    meta: "Student guidelines & policies",
    title: "Student guidelines & policies",
    lead: "What we expect from each other — on campus and online.",
    updated: "Applies to all on-campus and online classes",
    sections: [
      {
        heading: "Attendance & assessment",
        body: [
          "A minimum of 80% attendance is mandatory for certificate eligibility.",
          "Weighting: first test 25%, second test 25%, final test 50%. A minimum overall score of 60% is required to move on to the next level.",
          "B1/B2: at least three modules must be passed in the final test. No make-up tests are held for internal students.",
        ],
      },
      { heading: "Participation certificate", body: ["Official digital certificates (PDF) are issued by email based on successful completion, active participation and homework submission."] },
      {
        heading: "Conduct",
        body: [
          "Please arrive and leave on time; staying on the premises outside class hours is not permitted.",
          "Mobile phones are switched off during class. Harassment or disrespectful conduct towards instructors or classmates leads to expulsion.",
          "Outside food and private gatherings are not allowed without permission.",
        ],
      },
      {
        heading: "Safety, security & sustainability",
        body: [
          "Security checks apply to everyone; weapons are strictly prohibited. ASH is not responsible for the loss or theft of personal belongings or vehicles.",
          "Students must be collected at the gate; visitors cannot wait inside. Photography or video recording requires permission.",
          "Bring a reusable water bottle — refilling stations are available on campus.",
        ],
      },
    ],
  },
  de: {
    meta: "Richtlinien für Lernende",
    title: "Richtlinien für Lernende",
    lead: "Was wir voneinander erwarten — vor Ort und online.",
    updated: "Gilt für alle Kurse vor Ort und online",
    sections: [
      {
        heading: "Anwesenheit & Bewertung",
        body: [
          "Für das Zertifikat ist eine Anwesenheit von mindestens 80 % erforderlich.",
          "Gewichtung: erster Test 25 %, zweiter Test 25 %, Abschlusstest 50 %. Für die nächste Stufe sind insgesamt mindestens 60 % nötig.",
          "B1/B2: Im Abschlusstest müssen mindestens drei Module bestanden werden. Für interne Lernende gibt es keine Nachholtests.",
        ],
      },
      { heading: "Teilnahmezertifikat", body: ["Offizielle digitale Zertifikate (PDF) werden nach erfolgreichem Abschluss, aktiver Teilnahme und Abgabe der Hausaufgaben per E-Mail ausgestellt."] },
      {
        heading: "Verhalten",
        body: [
          "Bitte kommen und gehen Sie pünktlich; außerhalb der Unterrichtszeit ist der Aufenthalt auf dem Gelände nicht gestattet.",
          "Mobiltelefone sind im Unterricht ausgeschaltet. Belästigung oder respektloses Verhalten gegenüber Lehrkräften oder Mitlernenden führt zum Ausschluss.",
          "Mitgebrachtes Essen und private Feiern sind ohne Erlaubnis nicht gestattet.",
        ],
      },
      {
        heading: "Sicherheit & Nachhaltigkeit",
        body: [
          "Sicherheitskontrollen gelten für alle; Waffen sind streng verboten. ASH haftet nicht für Verlust oder Diebstahl persönlicher Gegenstände oder Fahrzeuge.",
          "Lernende werden am Tor abgeholt; Besucher können nicht im Gebäude warten. Foto- und Videoaufnahmen nur mit Erlaubnis.",
          "Bringen Sie eine wiederverwendbare Trinkflasche mit — auf dem Campus gibt es Nachfüllstationen.",
        ],
      },
    ],
  },
};

export const legalPages = { privacy, terms, guidelines };
