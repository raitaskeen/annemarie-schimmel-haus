import type { AgendaItem } from "../schema";

/* ------------------------------------------------------------------ events */

export type SeedEvent = {
  slug: string;
  titleEn: string;
  titleDe: string;
  summaryEn: string;
  summaryDe: string;
  bodyEn: string;
  bodyDe: string;
  category:
    | "cultural"
    | "language"
    | "info_session"
    | "exhibition"
    | "music"
    | "film"
    | "literature"
    | "workshop"
    | "community";
  startsAt: string;
  endsAt?: string;
  venue?: string;
  imagePath: string;
  imageAlt: string;
  capacity: number | null;
  requiresCnic?: boolean;
  maxGuests?: number;
  agenda?: AgendaItem[];
  collaborators?: string[];
  featured?: boolean;
  sampleRegistrations: number;
};

const ROOH_KA_SAUDA_VENUE =
  "Annemarie-Schimmel-Haus (German Cultural Centre Lahore), 155 Scotch Corner, Street 3, Upper Mall, Lahore";

const ROOH_KA_SAUDA_EN = `Annemarie-Schimmel-Haus, MAAS Foundation and the German Embassy Islamabad present **Rooh Ka Sauda**, an Urdu-language theatre production inspired by Goethe's *Faust*, directed by Aamir Nawaz.

**Performances**
- 1st performance: Friday, 6 November 2026, 7:30 pm
- 2nd performance: Saturday, 7 November 2026, 7:30 pm

**Important information**
- Admission is free with prior registration.
- Seats are limited; entry is first come, first served, even after registration.`;

const ROOH_KA_SAUDA_DE = `Das Annemarie-Schimmel-Haus, die MAAS Foundation und die Deutsche Botschaft Islamabad präsentieren **Rooh Ka Sauda**, eine Theaterproduktion in Urdu nach Goethes *Faust*, inszeniert von Aamir Nawaz.

**Aufführungen**
- 1. Aufführung: Freitag, 6. November 2026, 19:30 Uhr
- 2. Aufführung: Samstag, 7. November 2026, 19:30 Uhr

**Wichtige Hinweise**
- Eintritt frei mit vorheriger Anmeldung.
- Die Plätze sind begrenzt; der Einlass erfolgt in der Reihenfolge der Ankunft, auch nach Anmeldung.`;

/**
 * Open Day 2026, European Day of Languages 2026 and Rooh Ka Sauda are the institute's
 * published events. The other events are editable samples for the upcoming season.
 */
export const seedEvents: SeedEvent[] = [
  {
    slug: "open-day-2026",
    titleEn: "Open Day 2026: Your Roadmap to Germany",
    titleDe: "Open Day 2026: Ihr Weg nach Deutschland",
    summaryEn:
      "Interactive sessions on studying and working in Germany, safe migration pathways, a trial German class and live music, in collaboration with DAAD Pakistan, the German Embassy Islamabad and GIZ Pakistan.",
    summaryDe:
      "Interaktive Sessions zu Studium und Arbeit in Deutschland, sicheren Migrationswegen, eine Schnupperstunde Deutsch und Live-Musik, gemeinsam mit DAAD Pakistan, der Deutschen Botschaft Islamabad und GIZ Pakistan.",
    bodyEn: `Join us for an informative afternoon packed with guidance on studying and working in Germany, migration pathways, trial classes and live cultural entertainment.

**Important information**
- Entry is open for all, but prior free registration is mandatory.
- Please bring your original CNIC, no entry without it.
- Seats are limited and allocated on a first-come, first-served basis.`,
    bodyDe: `Ein informativer Nachmittag rund um Studium und Arbeit in Deutschland, Migrationswege, Schnupperunterricht und kulturelles Programm.

**Wichtige Hinweise**
- Der Eintritt ist frei, eine vorherige kostenlose Anmeldung ist jedoch erforderlich.
- Bitte bringen Sie Ihre Original-CNIC mit, ohne sie ist kein Einlass möglich.
- Die Plätze sind begrenzt und werden nach Eingang vergeben.`,
    category: "info_session",
    startsAt: "2026-10-10T12:00:00+05:00",
    endsAt: "2026-10-10T16:15:00+05:00",
    venue: "Garden, Annemarie-Schimmel-Haus",
    imagePath: "/images/polished/ash-fb-0038.webp",
    imageAlt: "Higher Studies in Germany presentation for prospective applicants.",
    capacity: 250,
    requiresCnic: true,
    collaborators: ["DAAD Pakistan", "German Embassy Islamabad", "GIZ Pakistan"],
    agenda: [
      { time: "12:00", titleEn: "Welcome note by the Director, Annemarie-Schimmel-Haus", titleDe: "Begrüßung durch die Direktorin des Annemarie-Schimmel-Hauses", location: "Garden" },
      { time: "12:20", titleEn: "DAAD presentations: Higher studies in Germany · Choosing the right study programme (incl. Q&A)", titleDe: "DAAD: Studieren in Deutschland · Den richtigen Studiengang wählen (mit Fragerunde)", location: "Garden" },
      { time: "13:00", titleEn: "Tips & best practices for your life and work in Germany (incl. Q&A)", titleDe: "Tipps für Leben und Arbeiten in Deutschland (mit Fragerunde)", location: "Garden" },
      { time: "13:30", titleEn: "Safe and regular migration to Germany", titleDe: "Sichere und reguläre Migration nach Deutschland", location: "Garden" },
      { time: "14:00", titleEn: "Break", titleDe: "Pause" },
      { time: "14:20", titleEn: "How to write an impressive motivation letter", titleDe: "So schreiben Sie ein überzeugendes Motivationsschreiben", location: "Garden" },
      { time: "14:50", titleEn: "How to survive on a budget in Germany", titleDe: "Mit kleinem Budget in Deutschland leben", location: "Garden" },
      { time: "15:10", titleEn: "Schnupperkurs: trial German class for beginners", titleDe: "Schnupperkurs: Deutsch für Anfänger", location: "Garden" },
      { time: "15:30", titleEn: "Kahoot quiz on Europe & Germany", titleDe: "Kahoot-Quiz zu Europa und Deutschland", location: "Garden" },
      { time: "15:50", titleEn: "Musical entertainment", titleDe: "Musikalisches Programm", location: "Garden" },
    ],
    sampleRegistrations: 0,
  },
  {
    slug: "european-day-of-languages-2026",
    titleEn: "European Day of Languages 2026: Languages Unite!",
    titleDe: "Europäischer Tag der Sprachen 2026: Sprachen verbinden!",
    summaryEn:
      "An afternoon of language games, mini-lessons and culture, co-hosted with Alliance Française de Lahore at our shared campus on Scotch Corner.",
    summaryDe:
      "Ein Nachmittag mit Sprachspielen, Mini-Lektionen und Kultur, gemeinsam mit der Alliance Française de Lahore auf unserem gemeinsamen Gelände am Scotch Corner.",
    bodyEn:
      "Celebrate Europe's linguistic diversity with taster lessons, quizzes and performances. Organised by Annemarie-Schimmel-Haus and Alliance Française Lahore.",
    bodyDe:
      "Feiern Sie die sprachliche Vielfalt Europas mit Schnupperstunden, Quiz und Aufführungen. Veranstaltet vom Annemarie-Schimmel-Haus und der Alliance Française Lahore.",
    category: "language",
    startsAt: "2026-10-17T16:00:00+05:00",
    endsAt: "2026-10-17T19:00:00+05:00",
    imagePath: "/images/events/european-day-of-languages-2026.webp",
    imageAlt:
      "European Day of Languages 2026 poster: Saturday 17 October, 4 pm onwards, 155 Scotch Corner, Lahore, organised by ASH and Alliance Française Lahore.",
    capacity: null,
    collaborators: ["Alliance Française de Lahore"],
    sampleRegistrations: 0,
  },
  {
    slug: "rooh-ka-sauda-2026-friday",
    titleEn: "Rooh Ka Sauda: Friday performance",
    titleDe: "Rooh Ka Sauda: Aufführung am Freitag",
    summaryEn:
      "An Urdu-language theatre production inspired by Goethe's Faust, directed by Aamir Nawaz (MAAS Foundation). Free entry with prior registration.",
    summaryDe:
      "Eine Theaterproduktion in Urdu nach Goethes Faust, inszeniert von Aamir Nawaz (MAAS Foundation). Eintritt frei mit vorheriger Anmeldung.",
    bodyEn: ROOH_KA_SAUDA_EN,
    bodyDe: ROOH_KA_SAUDA_DE,
    category: "cultural",
    startsAt: "2026-11-06T19:30:00+05:00",
    venue: ROOH_KA_SAUDA_VENUE,
    imagePath: "/images/polished/ash-dslr-1358.webp",
    imageAlt: "The Annemarie-Schimmel-Haus on Upper Mall, Lahore, venue of Rooh Ka Sauda.",
    capacity: 150,
    collaborators: ["MAAS Foundation", "German Embassy Islamabad"],
    featured: true,
    sampleRegistrations: 0,
  },
  {
    slug: "rooh-ka-sauda-2026-saturday",
    titleEn: "Rooh Ka Sauda: Saturday performance",
    titleDe: "Rooh Ka Sauda: Aufführung am Samstag",
    summaryEn:
      "An Urdu-language theatre production inspired by Goethe's Faust, directed by Aamir Nawaz (MAAS Foundation). Free entry with prior registration.",
    summaryDe:
      "Eine Theaterproduktion in Urdu nach Goethes Faust, inszeniert von Aamir Nawaz (MAAS Foundation). Eintritt frei mit vorheriger Anmeldung.",
    bodyEn: ROOH_KA_SAUDA_EN,
    bodyDe: ROOH_KA_SAUDA_DE,
    category: "cultural",
    startsAt: "2026-11-07T19:30:00+05:00",
    venue: ROOH_KA_SAUDA_VENUE,
    imagePath: "/images/polished/ash-dslr-1358.webp",
    imageAlt: "The Annemarie-Schimmel-Haus on Upper Mall, Lahore, venue of Rooh Ka Sauda.",
    capacity: 150,
    collaborators: ["MAAS Foundation", "German Embassy Islamabad"],
    sampleRegistrations: 0,
  },
  {
    slug: "kinotag-german-cinema-evening",
    titleEn: "KinoTag: German Cinema Evening",
    titleDe: "KinoTag: Deutscher Filmabend",
    summaryEn:
      "A contemporary German feature film with English subtitles, followed by an open conversation over chai in the garden.",
    summaryDe:
      "Ein aktueller deutscher Spielfilm mit englischen Untertiteln, danach ein offenes Gespräch bei Chai im Garten.",
    bodyEn:
      "Our KinoTag series brings award-winning German cinema to Lahore. Doors open 30 minutes before the screening. Free entry, registration helps us plan seating.",
    bodyDe:
      "Unsere KinoTag-Reihe bringt preisgekröntes deutsches Kino nach Lahore. Einlass 30 Minuten vor Beginn. Eintritt frei, die Anmeldung hilft uns bei der Platzplanung.",
    category: "film",
    startsAt: "2026-11-13T17:00:00+05:00",
    endsAt: "2026-11-13T19:30:00+05:00",
    imagePath: "/images/polished/ash-fb-0032.webp",
    imageAlt: "KinoTag im Schimmel-Haus: contemporary German cinema series.",
    capacity: 80,
    maxGuests: 1,
    sampleRegistrations: 31,
  },
  {
    slug: "st-martins-lantern-evening-2026",
    titleEn: "St. Martin's Lantern Evening",
    titleDe: "Sankt-Martins-Laternenabend",
    summaryEn:
      "Make lanterns, sing traditional songs and walk through the garden, a beloved German autumn tradition for families and learners.",
    summaryDe:
      "Laternen basteln, traditionelle Lieder singen und durch den Garten ziehen, eine beliebte deutsche Herbsttradition für Familien und Lernende.",
    bodyEn:
      "Bring the whole family. Lantern-making starts at 5:30 pm; the lantern walk begins at dusk. You may register up to three accompanying guests.",
    bodyDe:
      "Bringen Sie die ganze Familie mit. Das Laternenbasteln beginnt um 17:30 Uhr, der Laternenumzug bei Einbruch der Dunkelheit. Sie können bis zu drei Begleitpersonen anmelden.",
    category: "community",
    startsAt: "2026-11-11T17:30:00+05:00",
    endsAt: "2026-11-11T19:30:00+05:00",
    venue: "Garden, Annemarie-Schimmel-Haus",
    imagePath: "/images/polished/ash-fb-0078.webp",
    imageAlt: "Sankt Martinstag evening lantern celebration on campus.",
    capacity: 120,
    maxGuests: 3,
    sampleRegistrations: 24,
  },
  {
    slug: "creative-writing-contemporary-german-prose",
    titleEn: "Creative Writing Workshop: Contemporary German Prose",
    titleDe: "Schreibwerkstatt: Deutsche Gegenwartsprosa",
    summaryEn:
      "Read, discuss and write short prose with fellow writers from Lahore, in English and German, for B1 learners and above.",
    summaryDe:
      "Kurzprosa lesen, diskutieren und schreiben mit Autorinnen und Autoren aus Lahore, auf Englisch und Deutsch, ab Niveau B1.",
    bodyEn:
      "Building on our authors' workshop series, this hands-on session explores narrative voice and translation. Places are limited to keep the group small.",
    bodyDe:
      "Aufbauend auf unserer Werkstattreihe mit Gastautoren widmet sich diese praktische Session Erzählstimme und Übersetzung. Die Gruppe bleibt bewusst klein.",
    category: "literature",
    startsAt: "2026-11-20T15:00:00+05:00",
    endsAt: "2026-11-20T18:00:00+05:00",
    venue: "Seminar room, Annemarie-Schimmel-Haus",
    imagePath: "/images/polished/ash-fb-0123.webp",
    imageAlt: "Creative writing workshop at ASH led by visiting German author David Wagner.",
    capacity: 24,
    sampleRegistrations: 19,
  },
  {
    slug: "study-in-germany-info-session",
    titleEn: "Study in Germany: Information Session",
    titleDe: "Studieren in Deutschland: Infoveranstaltung",
    summaryEn:
      "Admission requirements, scholarships, language certificates and visa steps, explained clearly, with time for your questions.",
    summaryDe:
      "Zulassung, Stipendien, Sprachnachweise und Visumsschritte, klar erklärt, mit Zeit für Ihre Fragen.",
    bodyEn:
      "Ideal for students and graduates planning a Bachelor's, Master's or PhD in Germany. Please bring your original CNIC for entry.",
    bodyDe:
      "Ideal für Studierende und Absolventen, die einen Bachelor, Master oder eine Promotion in Deutschland planen. Bitte bringen Sie Ihre Original-CNIC mit.",
    category: "info_session",
    startsAt: "2026-11-28T12:00:00+05:00",
    endsAt: "2026-11-28T14:00:00+05:00",
    imagePath: "/images/polished/ash-fb-0040.webp",
    imageAlt: "Academic guidance on German university admission and research pathways.",
    capacity: 150,
    requiresCnic: true,
    sampleRegistrations: 64,
  },
  {
    slug: "winter-concert-berlin-to-lahore",
    titleEn: "Winter Concert: Berlin to Lahore",
    titleDe: "Winterkonzert: Von Berlin nach Lahore",
    summaryEn:
      "German and Pakistani musicians meet on one stage, classical, jazz and qawwali in a warm winter evening under the lights.",
    summaryDe:
      "Deutsche und pakistanische Musikerinnen und Musiker auf einer Bühne: Klassik, Jazz und Qawwali an einem stimmungsvollen Winterabend.",
    bodyEn: "Free entry with registration. Seating opens at 5:30 pm.",
    bodyDe: "Freier Eintritt mit Anmeldung. Einlass ab 17:30 Uhr.",
    category: "music",
    startsAt: "2026-12-12T18:00:00+05:00",
    endsAt: "2026-12-12T20:30:00+05:00",
    venue: "Garden stage, Annemarie-Schimmel-Haus",
    imagePath: "/images/polished/ash-fb-0184.webp",
    imageAlt: "German fusion ensemble “Berlin to Lahore” performing live.",
    capacity: 200,
    maxGuests: 1,
    featured: true,
    sampleRegistrations: 42,
  },
  {
    slug: "advent-market-2026",
    titleEn: "Advent Market in the Garden",
    titleDe: "Adventsmarkt im Garten",
    summaryEn:
      "Handmade crafts, seasonal treats and German Christmas carols, local makers and our students in one festive afternoon.",
    summaryDe:
      "Handgemachtes, weihnachtliche Leckereien und deutsche Weihnachtslieder, lokale Kunsthandwerker und unsere Lernenden an einem festlichen Nachmittag.",
    bodyEn: "Open to everyone. No registration required.",
    bodyDe: "Offen für alle. Keine Anmeldung erforderlich.",
    category: "cultural",
    startsAt: "2026-12-19T12:00:00+05:00",
    endsAt: "2026-12-19T17:00:00+05:00",
    venue: "Garden, Annemarie-Schimmel-Haus",
    imagePath: "/images/polished/ash-official-2025-018.webp",
    imageAlt: "Colourful handmade tote bags displayed at an outdoor market.",
    capacity: null,
    sampleRegistrations: 0,
  },
];

/* ------------------------------------------------------------------- posts */

export type SeedPost = {
  slug: string;
  category: "news" | "announcement" | "scholarship" | "job" | "press";
  titleEn: string;
  titleDe: string;
  excerptEn: string;
  excerptDe: string;
  bodyEn: string;
  bodyDe: string;
  imagePath?: string;
  pinned?: boolean;
  publishedAt: string;
};

export const seedPosts: SeedPost[] = [
  {
    slug: "open-day-2026-roadmap-to-germany",
    category: "announcement",
    titleEn: "Open Day 2026: Your Roadmap to Germany",
    titleDe: "Open Day 2026: Ihr Weg nach Deutschland",
    excerptEn: "Studying, working and living in Germany, sessions with DAAD Pakistan, the German Embassy Islamabad and GIZ Pakistan.",
    excerptDe: "Studieren, arbeiten und leben in Deutschland, mit DAAD Pakistan, der Deutschen Botschaft Islamabad und GIZ Pakistan.",
    bodyEn:
      "On Saturday, 10 October 2026, our garden became a roadmap to Germany: presentations by DAAD, practical tips for life and work in Germany, safe migration pathways, a trial German class and music. Thank you to everyone who joined!",
    bodyDe:
      "Am Samstag, 10. Oktober 2026, wurde unser Garten zum Wegweiser nach Deutschland: Vorträge des DAAD, praktische Tipps für Leben und Arbeit, sichere Migrationswege, ein Schnupperkurs und Musik. Danke an alle, die dabei waren!",
    imagePath: "/images/polished/ash-fb-0038.webp",
    publishedAt: "2026-09-18T10:00:00+05:00",
  },
  {
    slug: "european-day-of-languages-2026",
    category: "announcement",
    titleEn: "European Day of Languages 2026: Languages Unite!",
    titleDe: "Europäischer Tag der Sprachen 2026: Sprachen verbinden!",
    excerptEn: "Saturday, 17 October, from 4 pm at 155 Scotch Corner, together with Alliance Française Lahore.",
    excerptDe: "Samstag, 17. Oktober, ab 16 Uhr am 155 Scotch Corner, gemeinsam mit der Alliance Française Lahore.",
    bodyEn:
      "Annemarie-Schimmel-Haus and Alliance Française Lahore celebrated the European Day of Languages with taster lessons, games and performances on our shared campus.",
    bodyDe:
      "Das Annemarie-Schimmel-Haus und die Alliance Française Lahore feierten den Europäischen Tag der Sprachen mit Schnupperstunden, Spielen und Aufführungen auf unserem gemeinsamen Gelände.",
    imagePath: "/images/events/european-day-of-languages-2026.webp",
    publishedAt: "2026-10-05T10:00:00+05:00",
  },
  {
    slug: "goethe-exam-registration-karachi-webshop",
    category: "news",
    titleEn: "Goethe exam registration now via Goethe-Institut Karachi",
    titleDe: "Goethe-Prüfungsanmeldung jetzt über das Goethe-Institut Karachi",
    excerptEn: "From January 2026, registration for Goethe-Institut examinations is handled through the Goethe-Institut Karachi webshop.",
    excerptDe: "Seit Januar 2026 erfolgt die Anmeldung zu Goethe-Prüfungen über den Webshop des Goethe-Instituts Karachi.",
    bodyEn:
      "From January 2026, exam registration is conducted by the Goethe-Institut Karachi via their webshop portal. Exams continue to take place in Lahore. For questions about registration, please contact the Goethe-Institut Karachi at (+92) (21) 35141033-6.",
    bodyDe:
      "Seit Januar 2026 erfolgt die Prüfungsanmeldung über das Webshop-Portal des Goethe-Instituts Karachi. Die Prüfungen finden weiterhin in Lahore statt. Bei Fragen zur Anmeldung wenden Sie sich bitte an das Goethe-Institut Karachi unter (+92) (21) 35141033-6.",
    pinned: true,
    publishedAt: "2026-01-05T10:00:00+05:00",
  },
  {
    slug: "job-german-language-instructor-a1-c1",
    category: "job",
    titleEn: "Job opportunity: German Language Instructor (A1 to C1)",
    titleDe: "Stellenangebot: Lehrkraft für Deutsch als Fremdsprache (A1 bis C1)",
    excerptEn: "We are looking for dynamic, qualified instructors to teach adults from A1 to C1.",
    excerptDe: "Wir suchen engagierte, qualifizierte Lehrkräfte für Erwachsene von A1 bis C1.",
    bodyEn: `Annemarie-Schimmel-Haus Lahore is looking for dynamic and qualified German language instructors for A1 to C1 levels.

**Requirements**
- German language proficiency certified at least at B2 level
- Minimum Bachelor's degree; teaching experience is a plus
- Good communication skills in English and Urdu
- Confident personality with classroom management skills and basic digital media knowledge

**Key responsibilities**
- Teaching adults German in interactive classes
- Course preparation, including lesson plans and class tests
- Regular attendance at trainings, workshops and conferences
- Readiness to reach C2 and complete the Goethe-Institut "Deutsch Lehren Lernen" (DLL) programme

Send your CV, cover letter and a recent photograph to **admin@schimmel.com.pk**.`,
    bodyDe: `Das Annemarie-Schimmel-Haus Lahore sucht engagierte und qualifizierte Lehrkräfte für Deutsch von A1 bis C1.

**Voraussetzungen**
- Deutschkenntnisse mindestens auf Niveau B2 (zertifiziert)
- Mindestens Bachelorabschluss; Unterrichtserfahrung ist von Vorteil
- Gute Kommunikationsfähigkeit auf Englisch und Urdu
- Souveränes Auftreten, Klassenführung und digitale Grundkenntnisse

**Aufgaben**
- Interaktiver Deutschunterricht für Erwachsene
- Unterrichtsvorbereitung inklusive Stundenplanung und Tests
- Regelmäßige Teilnahme an Fortbildungen, Workshops und Konferenzen
- Bereitschaft, C2 zu erreichen und das Goethe-Programm „Deutsch Lehren Lernen" (DLL) abzuschließen

Bitte senden Sie Lebenslauf, Anschreiben und ein aktuelles Foto an **admin@schimmel.com.pk**.`,
    imagePath: "/images/polished/ash-fb-0001.webp",
    publishedAt: "2026-06-15T10:00:00+05:00",
  },
  {
    slug: "scholarship-programme-2026",
    category: "scholarship",
    titleEn: "Scholarship Programme 2026, need-based scholarships for A2 & above",
    titleDe: "Stipendienprogramm 2026, bedarfsorientierte Stipendien ab A2",
    excerptEn: "Support for dedicated learners based on academic performance, attendance and financial need.",
    excerptDe: "Förderung engagierter Lernender nach Leistung, Anwesenheit und finanzieller Situation.",
    bodyEn: `We offer need-based scholarships in our German language courses for learners at A2 and above.

**Scholarships are awarded based on**
- **Academic performance**, prior grades, test results and achievements
- **Class attendance**, consistency, punctuality and active participation
- **Financial situation**, an assessment of the student's and family's need

To apply or ask about the process, contact us at info@schimmel.com.pk or +92 42 111 150 111.`,
    bodyDe: `Wir vergeben bedarfsorientierte Stipendien für unsere Deutschkurse ab Niveau A2.

**Vergabekriterien**
- **Leistung**: Noten, Testergebnisse und Erfolge
- **Anwesenheit**: Regelmäßigkeit, Pünktlichkeit und aktive Mitarbeit
- **Finanzielle Situation**: Bedarf der Lernenden und ihrer Familie

Für Bewerbung und Fragen: info@schimmel.com.pk oder +92 42 111 150 111.`,
    imagePath: "/images/gallery/ash-fb-0004.webp",
    publishedAt: "2026-01-02T10:00:00+05:00",
  },
];

/* ---------------------------------------------------------------- partners */

export const seedPartners = [
  {
    slug: "goethe-institut",
    name: "Goethe-Institut Pakistan",
    categoryEn: "Cooperation partner",
    categoryDe: "Kooperationspartner",
    descriptionEn:
      "ASH is a cooperation partner of the Goethe-Institut, Germany's cultural institute. Our courses follow its curriculum and prepare learners for Goethe examinations.",
    descriptionDe:
      "ASH ist Kooperationspartner des Goethe-Instituts, des Kulturinstituts der Bundesrepublik Deutschland. Unsere Kurse folgen seinem Curriculum und bereiten auf Goethe-Prüfungen vor.",
    url: "https://www.goethe.de/pakistan",
    logoPath: "/brand/partners/goethe.png",
    logoWidth: 1169,
    logoHeight: 568,
  },
  {
    slug: "daad",
    name: "DAAD",
    categoryEn: "Academic exchange",
    categoryDe: "Akademischer Austausch",
    descriptionEn:
      "The German Academic Exchange Service supports university partnerships, research cooperation and student scholarships.",
    descriptionDe:
      "Der Deutsche Akademische Austauschdienst fördert Hochschulkooperationen, Forschung und Stipendien.",
    url: "https://www.daad.de",
    logoPath: "/brand/partners/daad.png",
    logoWidth: 1067,
    logoHeight: 381,
  },
  {
    slug: "german-embassy-islamabad",
    name: "German Embassy Islamabad",
    categoryEn: "Diplomatic mission",
    categoryDe: "Diplomatische Vertretung",
    descriptionEn:
      "The official representation of the Federal Republic of Germany in Pakistan, deepening bilateral cultural ties.",
    descriptionDe:
      "Die offizielle Vertretung der Bundesrepublik Deutschland in Pakistan zur Vertiefung der kulturellen Beziehungen.",
    url: "https://pakistan.diplo.de",
    logoPath: "/brand/partners/german-embassy.png",
    logoWidth: 1205,
    logoHeight: 337,
  },
  {
    slug: "pasch",
    name: "PASCH, Schulen: Partner der Zukunft",
    categoryEn: "School network",
    categoryDe: "Schulnetzwerk",
    descriptionEn:
      "A global network connecting schools with strong German language instruction and international exchange.",
    descriptionDe:
      "Ein weltweites Netzwerk von Schulen mit starkem Deutschunterricht und internationalem Austausch.",
    url: "https://www.pasch-net.de",
    logoPath: "/brand/partners/pasch.png",
    logoWidth: 1221,
    logoHeight: 929,
  },
  {
    slug: "alliance-francaise-lahore",
    name: "Alliance Française de Lahore",
    categoryEn: "Cultural cooperation",
    categoryDe: "Kulturkooperation",
    descriptionEn:
      "Our neighbours on Scotch Corner: we share premises and co-host language events such as the European Day of Languages.",
    descriptionDe:
      "Unsere Nachbarn am Scotch Corner: Wir teilen Räumlichkeiten und veranstalten gemeinsam Sprachereignisse wie den Europäischen Tag der Sprachen.",
    url: "https://aflahore.org",
    logoPath: "/brand/partners/alliance-francaise.png",
    logoWidth: 600,
    logoHeight: 143,
  },
  {
    slug: "giz-pakistan",
    name: "GIZ Pakistan",
    categoryEn: "Development cooperation",
    categoryDe: "Entwicklungszusammenarbeit",
    descriptionEn:
      "Deutsche Gesellschaft für Internationale Zusammenarbeit, collaborator of our Open Day on safe and regular migration to Germany.",
    descriptionDe:
      "Deutsche Gesellschaft für Internationale Zusammenarbeit: Partner unseres Open Day zu sicherer und regulärer Migration nach Deutschland.",
    url: "https://www.giz.de/en/worldwide/360.html",
    logoPath: "/brand/partners/giz.png",
    logoWidth: 1803,
    logoHeight: 478,
  },
  {
    slug: "fccu",
    name: "Forman Christian College",
    categoryEn: "Literary dialogue",
    categoryDe: "Literarischer Dialog",
    descriptionEn: "Host of guest readings and literary exchange with visiting German authors.",
    descriptionDe: "Gastgeber von Lesungen und literarischem Austausch mit deutschen Gastautoren.",
    url: "https://www.fccollege.edu.pk",
    logoPath: "/brand/partners/fccu.png",
    logoWidth: 398,
    logoHeight: 400,
  },
  {
    slug: "university-of-lahore",
    name: "The University of Lahore",
    categoryEn: "Cultural project",
    categoryDe: "Kulturprojekt",
    descriptionEn: "Its School of Creative Arts collaborated with ASH on the Wanderlust Pakistan documentary project.",
    descriptionDe: "Die School of Creative Arts arbeitete mit ASH am Dokumentarprojekt Wanderlust Pakistan.",
    url: "https://uol.edu.pk",
    logoPath: "/brand/partners/uol.png",
    logoWidth: 600,
    logoHeight: 183,
  },
];

/* -------------------------------------------------------------- exam dates */

/** Published Goethe-Institut exam dates in Lahore, April to August 2026. */
export const seedExamDates = [
  { levels: ["B1", "B2"], registrationOn: "2026-04-10", examStartsOn: "2026-04-25", examEndsOn: "2026-04-26" },
  { levels: ["A2", "B1"], registrationOn: "2026-05-08", examStartsOn: "2026-05-23", examEndsOn: "2026-05-24" },
  { levels: ["B1", "B2"], registrationOn: "2026-06-05", examStartsOn: "2026-06-20", examEndsOn: "2026-06-21" },
  { levels: ["A2", "B1"], registrationOn: "2026-07-03", examStartsOn: "2026-07-25", examEndsOn: "2026-07-26" },
  { levels: ["B1", "B2"], registrationOn: "2026-08-07", examStartsOn: "2026-08-22", examEndsOn: "2026-08-23" },
];

/* ------------------------------------------------------- placement sessions */

export const seedPlacementSessions = [
  {
    code: "PT-2026-10-23",
    startsAt: "2026-10-23T10:00:00+05:00",
    endsAt: "2026-10-23T12:00:00+05:00",
    deadline: "2026-10-21T16:30:00+05:00",
    status: "closed" as const,
    capacity: 40,
    sample: 27,
  },
  {
    code: "PT-2026-11-20",
    startsAt: "2026-11-20T10:00:00+05:00",
    endsAt: "2026-11-20T12:00:00+05:00",
    deadline: "2026-11-18T16:30:00+05:00",
    status: "open" as const,
    capacity: 40,
    sample: 12,
  },
  {
    code: "PT-2026-12-18",
    startsAt: "2026-12-18T10:00:00+05:00",
    endsAt: "2026-12-18T12:00:00+05:00",
    deadline: "2026-12-16T16:30:00+05:00",
    status: "open" as const,
    capacity: 40,
    sample: 3,
  },
];

/* ---------------------------------------------------- synthetic people */

/** Synthetic sample people for local demos. Emails use the reserved example.com domain. */
export const samplePeople = [
  ["Ayesha", "Khan"], ["Hamza", "Malik"], ["Fatima", "Raza"], ["Ali", "Hassan"], ["Zainab", "Qureshi"],
  ["Usman", "Tariq"], ["Mariam", "Siddiqui"], ["Bilal", "Ahmed"], ["Hira", "Javed"], ["Saad", "Iqbal"],
  ["Noor", "Fatima"], ["Omar", "Farooq"], ["Sana", "Mir"], ["Hassan", "Sheikh"], ["Amna", "Butt"],
  ["Daniyal", "Chaudhry"], ["Iqra", "Nadeem"], ["Fahad", "Aslam"], ["Maham", "Riaz"], ["Taha", "Mehmood"],
  ["Aiman", "Shah"], ["Ahmed", "Rauf"], ["Laiba", "Hussain"], ["Zain", "Abbas"], ["Rabia", "Anwar"],
  ["Hadi", "Zaidi"], ["Mehwish", "Akram"], ["Shahzaib", "Khalid"], ["Areeba", "Saleem"], ["Imran", "Latif"],
] as const;
