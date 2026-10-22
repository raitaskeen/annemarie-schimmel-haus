import type { Locale } from "@/i18n/config";

const en = {
  metaTitle: "Apply for a German course",
  eyebrow: "Online application",
  title: "Apply for your course",
  lead: "Five short steps — about seven minutes. Your answers are saved on this device for 14 days, so you can pause and continue later (ID numbers and documents are never stored).",
  steps: [
    { key: "personal", title: "Personal details", description: "As written on your CNIC or B-Form." },
    { key: "contact", title: "Contact", description: "Where we send your confirmation and updates." },
    { key: "background", title: "Background", description: "Helps us place you in the right group." },
    { key: "documents", title: "Documents", description: "Photos from your phone are fine." },
    { key: "review", title: "Review & submit", description: "Check everything once, then send." },
  ],
  stepOf: "Step {n} of {total}",
  draftSaved: "Draft saved",
  placementNotice:
    "Joining this level from outside ASH? You'll need a Goethe-Institut certificate of the previous level or a passed ASH placement test.",
  placementLink: "See placement test dates",
  docs: {
    photo: { label: "Passport-size photograph", hint: "Plain background, face clearly visible." },
    cnicFront: { label: "CNIC / B-Form — front", hint: "All four corners visible, no glare." },
    cnicBack: { label: "CNIC / B-Form — back", hint: "All four corners visible, no glare." },
    degree: { label: "Last educational degree", hint: "Optional · image or PDF." },
    drop: "Drop a file here or",
    browse: "browse",
    replace: "Replace",
    remove: "Remove",
    compressing: "Optimising…",
    privacy: "Documents are encrypted in transit, stored privately and only seen by our course office.",
  },
  review: {
    title: "Almost done",
    edit: "Edit",
    sections: { personal: "Personal details", contact: "Contact", background: "Background", documents: "Documents" },
    attached: "attached",
    missing: "missing",
  },
  summary: {
    title: "Your course",
    starts: "Starts",
    schedule: "Schedule",
    format: "Format",
    duration: "Duration",
    fee: "Course fee",
    book: "Textbook",
    seats: "Seats",
    prepare: "Have ready",
    prepareItems: ["CNIC or B-Form", "A passport-size photo", "Your last degree (optional)"],
  },
  unavailable: {
    closed: "Applications for this batch are closed.",
    opens: "Applications for this batch open on {date}.",
    other: "See other dates",
  },
  submit: "Submit application",
  waitlistSubmit: "Join the waitlist",
  full: "This batch is full — you can still apply to join the waitlist.",
  charCount: "{n} characters",
};

export type EnrollCopy = typeof en;

const de: EnrollCopy = {
  metaTitle: "Für einen Deutschkurs anmelden",
  eyebrow: "Online-Anmeldung",
  title: "Melden Sie sich an",
  lead: "Fünf kurze Schritte — etwa sieben Minuten. Ihre Angaben bleiben 14 Tage auf diesem Gerät gespeichert, sodass Sie jederzeit später weitermachen können (Ausweisnummern und Dokumente werden nie gespeichert).",
  steps: [
    { key: "personal", title: "Persönliche Daten", description: "Wie auf Ihrer CNIC oder B-Form." },
    { key: "contact", title: "Kontakt", description: "Hierhin senden wir Bestätigung und Updates." },
    { key: "background", title: "Hintergrund", description: "Damit wir Sie der richtigen Gruppe zuordnen." },
    { key: "documents", title: "Dokumente", description: "Fotos mit dem Handy genügen." },
    { key: "review", title: "Prüfen & absenden", description: "Einmal alles prüfen, dann senden." },
  ],
  stepOf: "Schritt {n} von {total}",
  draftSaved: "Entwurf gespeichert",
  placementNotice:
    "Sie steigen auf diesem Niveau von außerhalb ein? Dann benötigen Sie ein Goethe-Zertifikat der vorherigen Stufe oder einen bestandenen ASH-Einstufungstest.",
  placementLink: "Termine für den Einstufungstest",
  docs: {
    photo: { label: "Passfoto", hint: "Neutraler Hintergrund, Gesicht gut erkennbar." },
    cnicFront: { label: "CNIC / B-Form — Vorderseite", hint: "Alle vier Ecken sichtbar, keine Spiegelung." },
    cnicBack: { label: "CNIC / B-Form — Rückseite", hint: "Alle vier Ecken sichtbar, keine Spiegelung." },
    degree: { label: "Letzter Bildungsabschluss", hint: "Optional · Bild oder PDF." },
    drop: "Datei hierher ziehen oder",
    browse: "auswählen",
    replace: "Ersetzen",
    remove: "Entfernen",
    compressing: "Wird optimiert…",
    privacy: "Dokumente werden verschlüsselt übertragen, vertraulich gespeichert und nur von unserem Kursbüro eingesehen.",
  },
  review: {
    title: "Fast geschafft",
    edit: "Bearbeiten",
    sections: { personal: "Persönliche Daten", contact: "Kontakt", background: "Hintergrund", documents: "Dokumente" },
    attached: "angehängt",
    missing: "fehlt",
  },
  summary: {
    title: "Ihr Kurs",
    starts: "Beginn",
    schedule: "Zeitplan",
    format: "Format",
    duration: "Dauer",
    fee: "Kursgebühr",
    book: "Lehrbuch",
    seats: "Plätze",
    prepare: "Bereithalten",
    prepareItems: ["CNIC oder B-Form", "Ein Passfoto", "Ihr letzter Abschluss (optional)"],
  },
  unavailable: {
    closed: "Die Anmeldung für diese Gruppe ist geschlossen.",
    opens: "Die Anmeldung für diese Gruppe beginnt am {date}.",
    other: "Andere Termine ansehen",
  },
  submit: "Anmeldung absenden",
  waitlistSubmit: "Auf die Warteliste",
  full: "Diese Gruppe ist voll — Sie können sich trotzdem für die Warteliste anmelden.",
  charCount: "{n} Zeichen",
};

export function enrollCopy(locale: Locale): EnrollCopy {
  return locale === "de" ? de : en;
}
