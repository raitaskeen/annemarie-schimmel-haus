import type { Locale } from "@/i18n/config";

/** Copy for "Schimmel", the website assistant (src/components/chat). */
const en = {
  name: "Schimmel",
  role: "Haus guide",
  status: "Online · answers in seconds",
  launcher: "Chat with Schimmel",
  teaser: "Hallo! Questions about courses, fees or the placement test? Ask me.",
  close: "Close chat",
  reset: "Start over",
  placeholder: "Ask about courses, fees, dates…",
  send: "Send",
  stop: "Stop",
  welcome:
    "Hallo! I'm **Schimmel**, the Haus's own guide. I know our courses, fees, batch dates, the placement test, Goethe exams and what's on at the Haus. What can I dig up for you?",
  suggestions: ["When does the next A1 start?", "How much is a course?", "Do I need the placement test?", "What's on this month?", "Where are you?"],
  thinking: [
    "Cogitating",
    "Fathoming",
    "Consulting the Duden",
    "Asking Goethe politely",
    "Untangling der, die, das",
    "Checking the timetable",
    "Squinting at the seat count",
    "Polishing the umlauts",
    "Brewing a cup of chai",
    "Double-checking, sceptically",
    "Conjugating irregular verbs",
    "Rummaging through the archive",
  ],
  error: "Hmm, my line to the office just dropped. Give it another go in a moment, or call us on",
  rateLimited: "You're quick! Let me catch my breath for a minute, then ask away.",
  footnote: "Schimmel can get things wrong. For anything official, our office has the last word.",
};

const de: typeof en = {
  name: "Schimmel",
  role: "Ihr Haus-Guide",
  status: "Online · antwortet in Sekunden",
  launcher: "Mit Schimmel chatten",
  teaser: "Hallo! Fragen zu Kursen, Gebühren oder dem Einstufungstest? Fragen Sie mich.",
  close: "Chat schließen",
  reset: "Neu beginnen",
  placeholder: "Fragen zu Kursen, Gebühren, Terminen…",
  send: "Senden",
  stop: "Stopp",
  welcome:
    "Hallo! Ich bin **Schimmel**, der Guide des Hauses. Ich kenne unsere Kurse, Gebühren, Gruppentermine, den Einstufungstest, die Goethe-Prüfungen und das Programm im Haus. Was darf ich für Sie herausfinden?",
  suggestions: ["Wann beginnt der nächste A1-Kurs?", "Was kostet ein Kurs?", "Brauche ich den Einstufungstest?", "Was läuft diesen Monat?", "Wo finde ich Sie?"],
  thinking: [
    "Grübele",
    "Ergründe",
    "Frage den Duden",
    "Frage Goethe höflich",
    "Sortiere der, die, das",
    "Prüfe den Stundenplan",
    "Zähle die freien Plätze",
    "Poliere die Umlaute",
    "Koche einen Chai",
    "Prüfe skeptisch nach",
    "Konjugiere starke Verben",
    "Stöbere im Archiv",
  ],
  error: "Hmm, die Leitung zum Büro ist gerade abgerissen. Versuchen Sie es gleich noch einmal, oder rufen Sie uns an:",
  rateLimited: "Sie sind schnell! Ich brauche eine Minute zum Durchatmen, dann gern weiter.",
  footnote: "Schimmel kann sich irren. Verbindlich ist immer die Auskunft unseres Büros.",
};

export function chatCopy(locale: Locale) {
  return locale === "de" ? de : en;
}
