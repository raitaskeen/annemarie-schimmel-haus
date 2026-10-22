/**
 * Course catalogue. Fees, units, durations and books follow the published
 * "Course Fee Structure 2026" of Annemarie-Schimmel-Haus (schimmel.com.pk/fee-structure).
 * Can-do outcomes follow the CEFR descriptors used by the Goethe-Institut.
 */
export type SeedCourse = {
  slug: string;
  code: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  titleEn: string;
  titleDe: string;
  taglineEn: string;
  taglineDe: string;
  summaryEn: string;
  summaryDe: string;
  descriptionEn: string;
  descriptionDe: string;
  outcomesEn: string[];
  outcomesDe: string[];
  units: number;
  weeks: number;
  feePkr: number;
  bookTitle: string;
  bookFeePkr: number | null;
  requiresPlacement: boolean;
  imagePath: string;
};

export const seedCourses: SeedCourse[] = [
  {
    slug: "german-a1",
    code: "A1",
    level: "A1",
    titleEn: "German A1 · Beginner",
    titleDe: "Deutsch A1 · Einstieg",
    taglineEn: "Your first steps in German.",
    taglineDe: "Ihre ersten Schritte auf Deutsch.",
    summaryEn:
      "Start from zero. Introduce yourself, handle everyday situations and build a confident base in pronunciation, vocabulary and grammar.",
    summaryDe:
      "Starten Sie bei null. Stellen Sie sich vor, meistern Sie Alltagssituationen und legen Sie eine sichere Basis in Aussprache, Wortschatz und Grammatik.",
    descriptionEn: `The A1 course is designed for complete beginners. In small groups and with experienced instructors you learn to understand and use familiar everyday expressions and very simple sentences.

**What you will practise**
- Greeting people, introducing yourself and others
- Talking about family, work, hobbies and your daily routine
- Shopping, ordering food and asking for directions
- Filling in simple forms and writing short messages

The course follows the *Netzwerk A1 Neu* textbook and prepares you for the **Goethe-Zertifikat A1: Start Deutsch 1**.`,
    descriptionDe: `Der A1-Kurs richtet sich an Lernende ohne Vorkenntnisse. In kleinen Gruppen und mit erfahrenen Lehrkräften lernen Sie, vertraute Alltagsausdrücke und ganz einfache Sätze zu verstehen und zu verwenden.

**Das üben Sie**
- Sich und andere begrüßen und vorstellen
- Über Familie, Beruf, Hobbys und den Tagesablauf sprechen
- Einkaufen, Essen bestellen und nach dem Weg fragen
- Einfache Formulare ausfüllen und kurze Nachrichten schreiben

Der Kurs arbeitet mit dem Lehrwerk *Netzwerk A1 Neu* und bereitet auf das **Goethe-Zertifikat A1: Start Deutsch 1** vor.`,
    outcomesEn: [
      "Understand and use familiar everyday expressions",
      "Introduce yourself and ask others simple questions",
      "Interact simply when people speak slowly and clearly",
    ],
    outcomesDe: [
      "Vertraute Alltagsausdrücke verstehen und verwenden",
      "Sich vorstellen und anderen einfache Fragen stellen",
      "Sich einfach verständigen, wenn langsam und deutlich gesprochen wird",
    ],
    units: 160,
    weeks: 11,
    feePkr: 47000,
    bookTitle: "Netzwerk A1 Neu",
    bookFeePkr: 3700,
    requiresPlacement: false,
    imagePath: "/images/gallery/ash-campus-learning-space-05.webp",
  },
  {
    slug: "german-a2",
    code: "A2",
    level: "A2",
    titleEn: "German A2 · Elementary",
    titleDe: "Deutsch A2 · Grundstufe",
    taglineEn: "From phrases to real conversations.",
    taglineDe: "Von Redewendungen zu echten Gesprächen.",
    summaryEn:
      "Talk about your background, your surroundings and your plans. Handle routine tasks in shops, at work and on the phone with growing confidence.",
    summaryDe:
      "Sprechen Sie über Herkunft, Umfeld und Pläne. Erledigen Sie Routineaufgaben im Geschäft, im Beruf und am Telefon mit wachsender Sicherheit.",
    descriptionEn: `At A2 you move from single phrases to connected everyday communication. You understand sentences and frequently used expressions about familiar topics such as family, shopping, work and your immediate surroundings.

**Course focus**
- Describing experiences in the past
- Making appointments, giving reasons and comparing options
- Reading short texts such as emails, notices and advertisements
- Expanding grammar: perfect tense, modal verbs, subordinate clauses

The course uses *Netzwerk A2 Neu* and prepares you for the **Goethe-Zertifikat A2**.`,
    descriptionDe: `Auf A2 kommen Sie von einzelnen Wendungen zu zusammenhängender Alltagskommunikation. Sie verstehen Sätze und häufig gebrauchte Ausdrücke zu vertrauten Themen wie Familie, Einkaufen, Arbeit und nähere Umgebung.

**Kursschwerpunkte**
- Erlebnisse in der Vergangenheit beschreiben
- Termine vereinbaren, begründen und vergleichen
- Kurze Texte wie E-Mails, Aushänge und Anzeigen lesen
- Grammatik erweitern: Perfekt, Modalverben, Nebensätze

Der Kurs arbeitet mit *Netzwerk A2 Neu* und bereitet auf das **Goethe-Zertifikat A2** vor.`,
    outcomesEn: [
      "Communicate in simple, routine tasks",
      "Describe your background and immediate environment",
      "Understand sentences on topics of direct relevance",
    ],
    outcomesDe: [
      "Sich in einfachen, routinemäßigen Situationen verständigen",
      "Herkunft und direkte Umgebung beschreiben",
      "Sätze zu Themen von unmittelbarer Bedeutung verstehen",
    ],
    units: 160,
    weeks: 11,
    feePkr: 48000,
    bookTitle: "Netzwerk A2 Neu",
    bookFeePkr: 3800,
    requiresPlacement: true,
    imagePath: "/images/gallery/ash-campus-learning-space-06.webp",
  },
  {
    slug: "german-b1",
    code: "B1",
    level: "B1",
    titleEn: "German B1 · Intermediate",
    titleDe: "Deutsch B1 · Mittelstufe",
    taglineEn: "Independent German for study, work and travel.",
    taglineDe: "Selbstständiges Deutsch für Studium, Beruf und Reisen.",
    summaryEn:
      "Become an independent speaker: follow clear standard German, report on experiences, explain your views and deal with most situations while travelling.",
    summaryDe:
      "Werden Sie selbstständig: Folgen Sie klarem Standarddeutsch, berichten Sie von Erfahrungen, begründen Sie Meinungen und meistern Sie die meisten Situationen auf Reisen.",
    descriptionEn: `B1 is the threshold to independent language use and a common requirement for vocational training, family reunification and many work visas.

**Course focus**
- Following discussions on familiar topics at work, school and in leisure time
- Expressing opinions, hopes and plans with reasons
- Writing personal letters and simple formal emails
- Exam strategies for all four modules: reading, listening, writing and speaking

The course uses *Netzwerk B1 Neu* and prepares you for the **Goethe-Zertifikat B1**.`,
    descriptionDe: `B1 ist die Schwelle zur selbstständigen Sprachverwendung und häufig Voraussetzung für Ausbildung, Familiennachzug und viele Arbeitsvisa.

**Kursschwerpunkte**
- Gesprächen über vertraute Themen aus Beruf, Schule und Freizeit folgen
- Meinungen, Wünsche und Pläne begründet ausdrücken
- Persönliche Briefe und einfache formelle E-Mails schreiben
- Prüfungsstrategien für alle vier Module: Lesen, Hören, Schreiben, Sprechen

Der Kurs arbeitet mit *Netzwerk B1 Neu* und bereitet auf das **Goethe-Zertifikat B1** vor.`,
    outcomesEn: [
      "Understand the main points of clear standard language",
      "Deal with most situations while travelling",
      "Describe experiences, hopes and goals and justify opinions",
    ],
    outcomesDe: [
      "Hauptpunkte klarer Standardsprache verstehen",
      "Die meisten Situationen auf Reisen bewältigen",
      "Erfahrungen, Wünsche und Ziele beschreiben und Meinungen begründen",
    ],
    units: 180,
    weeks: 12,
    feePkr: 51000,
    bookTitle: "Netzwerk B1 Neu",
    bookFeePkr: 3900,
    requiresPlacement: true,
    imagePath: "/images/gallery/ash-campus-learning-space-04.webp",
  },
  {
    slug: "german-b2-1",
    code: "B2.1",
    level: "B2",
    titleEn: "German B2.1 · Upper intermediate (part 1)",
    titleDe: "Deutsch B2.1 · Gute Mittelstufe (Teil 1)",
    taglineEn: "Fluent, spontaneous and precise.",
    taglineDe: "Flüssig, spontan und präzise.",
    summaryEn:
      "Understand complex texts on concrete and abstract topics and discuss them fluently — the level most German universities and employers look for.",
    summaryDe:
      "Verstehen Sie komplexe Texte zu konkreten und abstrakten Themen und diskutieren Sie flüssig darüber — das Niveau, das viele Hochschulen und Arbeitgeber erwarten.",
    descriptionEn: `The B2 level is taught in two consecutive courses. B2.1 builds the foundations for confident, spontaneous communication.

**Course focus**
- Reading newspaper articles, reports and opinion pieces
- Taking part in discussions and presenting arguments
- Structured writing: summaries, complaints, formal letters
- Advanced grammar: passive, nominal style, connectors

The course uses *Kontext B2*.`,
    descriptionDe: `Das Niveau B2 wird in zwei aufeinanderfolgenden Kursen unterrichtet. B2.1 legt die Grundlage für sichere, spontane Kommunikation.

**Kursschwerpunkte**
- Zeitungsartikel, Berichte und Kommentare lesen
- An Diskussionen teilnehmen und argumentieren
- Strukturiert schreiben: Zusammenfassungen, Beschwerden, formelle Briefe
- Fortgeschrittene Grammatik: Passiv, Nominalstil, Konnektoren

Der Kurs arbeitet mit *Kontext B2*.`,
    outcomesEn: [
      "Understand the main ideas of complex texts",
      "Interact with fluency and spontaneity",
      "Produce clear, detailed text on a wide range of subjects",
    ],
    outcomesDe: [
      "Hauptinhalte komplexer Texte verstehen",
      "Sich spontan und fließend verständigen",
      "Sich klar und detailliert zu vielen Themen äußern",
    ],
    units: 160,
    weeks: 11,
    feePkr: 45000,
    bookTitle: "Kontext B2",
    bookFeePkr: 4500,
    requiresPlacement: true,
    imagePath: "/images/gallery/ash-campus-learning-space-07.webp",
  },
  {
    slug: "german-b2-2",
    code: "B2.2",
    level: "B2",
    titleEn: "German B2.2 · Upper intermediate (part 2)",
    titleDe: "Deutsch B2.2 · Gute Mittelstufe (Teil 2)",
    taglineEn: "Complete B2 and get exam-ready.",
    taglineDe: "B2 abschließen und prüfungsfit werden.",
    summaryEn:
      "Complete the B2 level with academic and professional topics, intensive exam training and plenty of speaking practice.",
    summaryDe:
      "Schließen Sie B2 mit akademischen und beruflichen Themen, intensivem Prüfungstraining und viel Sprechpraxis ab.",
    descriptionEn: `B2.2 continues directly from B2.1 with the same textbook and completes the level.

**Course focus**
- Academic and professional communication
- Presentations and moderated discussions
- Complete exam preparation for the **Goethe-Zertifikat B2**

Learners who completed B2.1 at ASH continue without a placement test.`,
    descriptionDe: `B2.2 schließt direkt an B2.1 an, arbeitet mit demselben Lehrwerk und schließt das Niveau ab.

**Kursschwerpunkte**
- Akademische und berufliche Kommunikation
- Präsentationen und moderierte Diskussionen
- Vollständige Vorbereitung auf das **Goethe-Zertifikat B2**

Wer B2.1 bei ASH abgeschlossen hat, setzt ohne Einstufungstest fort.`,
    outcomesEn: [
      "Discuss technical topics in your field",
      "Explain a viewpoint with advantages and disadvantages",
      "Master all four modules of the B2 examination",
    ],
    outcomesDe: [
      "Fachdiskussionen im eigenen Bereich führen",
      "Standpunkte mit Vor- und Nachteilen erläutern",
      "Alle vier Module der B2-Prüfung sicher bewältigen",
    ],
    units: 160,
    weeks: 11,
    feePkr: 45000,
    bookTitle: "Kontext B2 (continued from B2.1)",
    bookFeePkr: null,
    requiresPlacement: true,
    imagePath: "/images/gallery/ash-campus-learning-space-03.webp",
  },
  {
    slug: "german-c1",
    code: "C1",
    level: "C1",
    titleEn: "German C1 · Advanced",
    titleDe: "Deutsch C1 · Fortgeschritten",
    taglineEn: "Effective German for university and career.",
    taglineDe: "Wirkungsvolles Deutsch für Studium und Beruf.",
    summaryEn:
      "Use German flexibly and effectively in social, academic and professional life — including implicit meanings and well-structured argumentation.",
    summaryDe:
      "Verwenden Sie Deutsch flexibel und wirksam im gesellschaftlichen, akademischen und beruflichen Leben — einschließlich impliziter Bedeutungen und klarer Argumentation.",
    descriptionEn: `C1 is the advanced level required by many German universities for study in German-taught programmes.

**Course focus**
- Long, demanding texts and lectures, including implicit meanings
- Spontaneous, fluent expression without searching for words
- Clear, well-structured texts on complex subjects
- Preparation for the **Goethe-Zertifikat C1**

The course uses *Kontext C1* and runs over 16 weeks.`,
    descriptionDe: `C1 ist das fortgeschrittene Niveau, das viele deutsche Hochschulen für deutschsprachige Studiengänge verlangen.

**Kursschwerpunkte**
- Lange, anspruchsvolle Texte und Vorträge einschließlich impliziter Bedeutungen
- Spontaner, fließender Ausdruck ohne Wortsuche
- Klare, gut strukturierte Texte zu komplexen Themen
- Vorbereitung auf das **Goethe-Zertifikat C1**

Der Kurs arbeitet mit *Kontext C1* und dauert 16 Wochen.`,
    outcomesEn: [
      "Understand demanding, longer texts and implicit meaning",
      "Express ideas fluently and spontaneously",
      "Use language effectively for academic and professional purposes",
    ],
    outcomesDe: [
      "Anspruchsvolle, längere Texte und implizite Bedeutungen verstehen",
      "Sich spontan und fließend ausdrücken",
      "Die Sprache wirksam in Studium und Beruf einsetzen",
    ],
    units: 240,
    weeks: 16,
    feePkr: 77000,
    bookTitle: "Kontext C1",
    bookFeePkr: 6000,
    requiresPlacement: true,
    imagePath: "/images/gallery/ash-campus-learning-space-08.webp",
  },
];

export type SeedOffering = {
  courseCode: string;
  code: string;
  mode: "on_campus" | "online";
  track: "standard" | "intensive" | "superintensive";
  startsOn: string;
  weeks?: number;
  startTime: string;
  endTime: string;
  capacity: number;
  status: "open" | "closed";
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  /** Seats to fill with sample applications. */
  sampleSeats: number;
  noteEn?: string;
  noteDe?: string;
};

/**
 * The first five batches are the officially announced autumn 2026 courses.
 * Later batches are realistic samples so the enrolment journey can be tried
 * end to end; review them in /admin/courses before going live.
 */
export const seedOfferings: SeedOffering[] = [
  { courseCode: "A1", code: "A1-CAM-SI-2610", mode: "on_campus", track: "superintensive", startsOn: "2026-10-19", weeks: 8, startTime: "17:15", endTime: "20:30", capacity: 20, status: "closed", sampleSeats: 18 },
  { courseCode: "A1", code: "A1-ONL-SI-2611", mode: "online", track: "superintensive", startsOn: "2026-11-02", weeks: 8, startTime: "17:00", endTime: "20:30", capacity: 24, status: "open", registrationOpensAt: "2026-10-26T09:00:00+05:00", registrationClosesAt: "2026-10-31T16:30:00+05:00", sampleSeats: 0 },
  { courseCode: "A2", code: "A2-CAM-ST-2610", mode: "on_campus", track: "standard", startsOn: "2026-10-14", startTime: "12:00", endTime: "14:30", capacity: 20, status: "closed", sampleSeats: 16 },
  { courseCode: "A2", code: "A2-CAM-SI-2610", mode: "on_campus", track: "superintensive", startsOn: "2026-10-14", weeks: 8, startTime: "17:15", endTime: "20:30", capacity: 20, status: "closed", sampleSeats: 19 },
  { courseCode: "B1", code: "B1-CAM-ST-2610", mode: "on_campus", track: "standard", startsOn: "2026-10-21", startTime: "14:30", endTime: "17:00", capacity: 20, status: "closed", sampleSeats: 15 },
  { courseCode: "A1", code: "A1-CAM-ST-2611", mode: "on_campus", track: "standard", startsOn: "2026-11-09", startTime: "09:30", endTime: "12:00", capacity: 20, status: "open", registrationClosesAt: "2026-11-06T16:30:00+05:00", sampleSeats: 17 },
  { courseCode: "A1", code: "A1-ONL-ST-2611", mode: "online", track: "standard", startsOn: "2026-11-16", startTime: "18:00", endTime: "20:30", capacity: 25, status: "open", registrationClosesAt: "2026-11-13T16:30:00+05:00", sampleSeats: 9 },
  { courseCode: "A2", code: "A2-ONL-ST-2611", mode: "online", track: "standard", startsOn: "2026-11-09", startTime: "18:00", endTime: "20:30", capacity: 25, status: "open", registrationClosesAt: "2026-11-06T16:30:00+05:00", sampleSeats: 11 },
  { courseCode: "B1", code: "B1-ONL-ST-2611", mode: "online", track: "standard", startsOn: "2026-11-23", startTime: "17:00", endTime: "19:30", capacity: 25, status: "open", registrationClosesAt: "2026-11-20T16:30:00+05:00", sampleSeats: 6 },
  { courseCode: "B2.1", code: "B21-CAM-ST-2612", mode: "on_campus", track: "standard", startsOn: "2026-12-01", startTime: "14:30", endTime: "17:00", capacity: 18, status: "open", registrationClosesAt: "2026-11-27T16:30:00+05:00", sampleSeats: 7 },
  { courseCode: "B2.2", code: "B22-ONL-ST-2701", mode: "online", track: "standard", startsOn: "2027-01-11", startTime: "17:00", endTime: "19:30", capacity: 20, status: "open", registrationClosesAt: "2027-01-08T16:30:00+05:00", sampleSeats: 3 },
  { courseCode: "C1", code: "C1-CAM-ST-2701", mode: "on_campus", track: "standard", startsOn: "2027-01-18", startTime: "12:00", endTime: "14:30", capacity: 16, status: "open", registrationClosesAt: "2027-01-14T16:30:00+05:00", sampleSeats: 4 },
];
