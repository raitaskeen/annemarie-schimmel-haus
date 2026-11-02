import "server-only";
import type { Knowledge } from "./knowledge";

/**
 * Answers common questions straight from the site's data. Used when no LLM key is
 * configured and as the fallback when the provider is slow or down, so the assistant
 * always replies with something true and linked.
 */
const TOPICS: { key: Topic; words: RegExp }[] = [
  { key: "placement", words: /placement|einstuf|level test|which level|welche[sn]? (stufe|niveau)|my level|mein niveau/i },
  { key: "exams", words: /exam|prüfung|pruefung|zertifikat|certificate|goethe/i },
  { key: "fees", words: /fee|price|cost|how much|rupee|pkr|rs\.?\s?\d|kosten|preis|gebühr|teuer|cheap/i },
  { key: "next", words: /next|when|start|batch|schedule|timing|timetable|nächste|wann|beginn|termin|kurszeit/i },
  { key: "online", words: /online|zoom|remote|from home|von zu hause/i },
  { key: "enroll", words: /enrol|enroll|apply|register|sign ?up|admission|anmeld|bewerb|einschreib/i },
  { key: "track", words: /track|status|application number|reference|ash-e|verfolg|antrag/i },
  { key: "events", words: /event|concert|cinema|film|movie|exhibition|workshop|festival|what.?s on|what is on|happening|this (week|month)|programm?e?|veranstalt|konzert|kino|ausstellung|was läuft|diese[nr]? (woche|monat)/i },
  { key: "contact", words: /contact|phone|call|email|mail|whatsapp|address|where|location|directions|map|reach|kontakt|telefon|adresse|anfahrt|standort|bwob|finde ich|anrufen/i },
  { key: "hours", words: /hour|open|close|timing of office|öffnungs|geöffnet|uhrzeit/i },
  { key: "levels", words: /\b(a1|a2|b1|b2(\.\d)?|c1|c2)\b|level|cefr|beginner|anfänger|niveau|stufe/i },
  { key: "about", words: /who are you|about|history|schimmel|goethe-?institut partner|über (euch|uns)|geschichte/i },
  { key: "greeting", words: /^(hi|hello|hey|salam|assalam|hallo|guten (tag|morgen|abend)|servus|moin)\b/i },
  { key: "thanks", words: /thank|thanks|shukriya|danke|merci/i },
];

type Topic = "placement" | "exams" | "fees" | "next" | "online" | "enroll" | "track" | "events" | "contact" | "hours" | "levels" | "about" | "greeting" | "thanks";

export function offlineAnswer(question: string, k: Knowledge): string {
  const de = k.locale === "de";
  const found = TOPICS.filter((t) => t.words.test(question)).map((t) => t.key);
  const level = question.match(/\b(a1|a2|b1|b2\.?[12]?|c1)\b/i)?.[1]?.toUpperCase().replace(/^B2(?=[12])/, "B2.");
  const course = level ? k.courses.find((c) => c.code.toUpperCase() === level || c.level.toUpperCase() === level) : undefined;
  const parts: string[] = [];
  const say = (en: string, deText: string) => parts.push(de ? deText : en);

  // Longer questions on other subjects get an honest "not my department", short ones a hello.
  if (!found.length && question.trim().length > 24) {
    say(
      `Hmm, that one is outside my timetable. I'm at my best with **courses and fees**, **batch dates**, the **placement test**, **Goethe exams** and **events**. For anything else our office is happy to help: ${k.contact.phone} or the [contact page](${k.links.contact}).`,
      `Hmm, das liegt außerhalb meines Stundenplans. Am besten kenne ich mich mit **Kursen und Gebühren**, **Gruppenterminen**, dem **Einstufungstest**, **Goethe-Prüfungen** und **Veranstaltungen** aus. Für alles andere hilft unser Büro gern: ${k.contact.phone} oder das [Kontaktformular](${k.links.contact}).`,
    );
    return parts.join("\n\n");
  }
  if (!found.length || (found.length === 1 && found[0] === "greeting")) {
    say(
      `Hallo! 👋 I'm Schimmel, your guide to the Haus. I can tell you about **courses and fees**, the **next batches**, the **placement test**, **Goethe exams**, **events** or how to **reach us**. What would you like to know?`,
      `Hallo! 👋 Ich bin Schimmel, Ihr Guide im Haus. Ich weiß Bescheid über **Kurse und Gebühren**, die **nächsten Gruppen**, den **Einstufungstest**, **Goethe-Prüfungen**, **Veranstaltungen** und wie Sie **uns erreichen**. Was möchten Sie wissen?`,
    );
    return parts.join("\n\n");
  }
  if (found.includes("thanks") && found.length === 1) {
    say("Gern geschehen! That's German for *you're welcome*. Anything else I can dig up for you?", "Gern geschehen! Kann ich sonst noch etwas für Sie herausfinden?");
    return parts.join("\n\n");
  }

  if (course && (found.includes("fees") || found.includes("next") || found.includes("levels") || found.includes("enroll"))) {
    const n = course.next;
    say(
      `**${course.title}**: ${course.weeks} weeks, ${course.units} teaching units, **${course.fee}** per course.${course.requiresPlacement ? " Joining at this level? Take the placement test first, unless you're continuing from ASH." : ""}`,
      `**${course.title}**: ${course.weeks} Wochen, ${course.units} Unterrichtseinheiten, **${course.fee}** pro Kurs.${course.requiresPlacement ? " Quereinstieg? Dann zuerst den Einstufungstest, außer Sie kommen aus einem ASH-Kurs." : ""}`,
    );
    if (n)
      say(
        `Next batch: **${n.date}**, ${n.time}, ${n.mode}, ${n.seatsLeft} seats left. ${n.open ? `[Apply now](${n.href})` : `[See the course](${n.href})`}`,
        `Nächste Gruppe: **${n.date}**, ${n.time}, ${n.mode}, noch ${n.seatsLeft} Plätze. ${n.open ? `[Jetzt anmelden](${n.href})` : `[Zum Kurs](${n.href})`}`,
      );
    else say(`No batch is scheduled yet. [Course details](${course.href})`, `Noch keine Gruppe geplant. [Kursdetails](${course.href})`);
  } else if (found.includes("fees") || found.includes("next") || found.includes("levels") || found.includes("online")) {
    const rows = k.courses.map((c) => `- **${c.title}**: ${c.fee}${c.next ? ` · ${de ? "ab" : "next"} ${c.next.date} (${c.next.mode})` : ""}`);
    say(`Here's the whole ladder at a glance:\n${rows.join("\n")}`, `Unsere Kurse auf einen Blick:\n${rows.join("\n")}`);
    say(`All batches with times and seats: [German courses](${k.links.courses})`, `Alle Gruppen mit Zeiten und Plätzen: [Deutschkurse](${k.links.courses})`);
  }

  if (found.includes("placement")) {
    const p = k.placement;
    say(
      p
        ? `New to ASH but not a beginner? The **placement test** finds your level. Next session: **${p.date}**, ${p.time} (levels ${p.levels}), fee ${p.fee}, register by ${p.deadline}. [Book the test](${k.links.placement})`
        : `The **placement test** finds your level if you've learned German before. No session is scheduled right now. [Placement test](${k.links.placement})`,
      p
        ? `Neu bei uns, aber kein Anfänger? Der **Einstufungstest** bestimmt Ihr Niveau. Nächster Termin: **${p.date}**, ${p.time} (Niveaus ${p.levels}), Gebühr ${p.fee}, Anmeldung bis ${p.deadline}. [Zum Test](${k.links.placement})`
        : `Der **Einstufungstest** bestimmt Ihr Niveau. Derzeit ist kein Termin geplant. [Einstufungstest](${k.links.placement})`,
    );
  }
  if (found.includes("exams")) {
    const dates = k.exams.map((e) => `- ${e.date}: Goethe-Zertifikat ${e.levels}`).join("\n");
    say(
      `Goethe-Institut exams take place in Lahore; registration runs only through the official Goethe portal.${dates ? `\n${dates}` : ""}\n\n[Register on goethe.de](${k.goethePortal}) · [Exam overview](${k.links.exams})`,
      `Die Goethe-Prüfungen finden in Lahore statt; die Anmeldung läuft nur über das offizielle Goethe-Portal.${dates ? `\n${dates}` : ""}\n\n[Anmeldung auf goethe.de](${k.goethePortal}) · [Prüfungsübersicht](${k.links.exams})`,
    );
  }
  if (found.includes("enroll") && !course) {
    say(
      `Applying takes about seven minutes: pick a batch on [German courses](${k.links.courses}), fill in five short steps and upload your photo and CNIC. You'll get an application number to [track your application](${k.links.track}).`,
      `Die Anmeldung dauert etwa sieben Minuten: Gruppe unter [Deutschkurse](${k.links.courses}) wählen, fünf kurze Schritte ausfüllen, Foto und CNIC hochladen. Mit der Antragsnummer können Sie den [Status verfolgen](${k.links.track}).`,
    );
  }
  if (found.includes("track")) {
    say(
      `Use your application number (it starts with ASH-) and your phone number on the [tracking page](${k.links.track}).`,
      `Mit Ihrer Antragsnummer (beginnt mit ASH-) und Ihrer Telefonnummer auf der [Statusseite](${k.links.track}).`,
    );
  }
  if (found.includes("events")) {
    const list = k.events.map((e) => `- **${e.date}**, ${e.time}: [${e.title}](${e.href})`).join("\n");
    say(
      list ? `Coming up at the Haus:\n${list}\n\n[All events](${k.links.events})` : `Nothing is announced just yet. [Events](${k.links.events})`,
      list ? `Demnächst im Haus:\n${list}\n\n[Alle Veranstaltungen](${k.links.events})` : `Gerade ist nichts angekündigt. [Veranstaltungen](${k.links.events})`,
    );
  }
  if (found.includes("contact") || found.includes("hours")) {
    const c = k.contact;
    say(
      `📍 ${c.address} ([map](${c.mapUrl}))\n📞 ${c.phone} · WhatsApp +${c.whatsapp}\n✉️ ${c.email} (courses: ${c.coursesEmail})\n🕘 ${c.hours}\n\nOr write to us on the [contact page](${k.links.contact}).`,
      `📍 ${c.address} ([Karte](${c.mapUrl}))\n📞 ${c.phone} · WhatsApp +${c.whatsapp}\n✉️ ${c.email} (Kurse: ${c.coursesEmail})\n🕘 ${c.hours}\n\nOder schreiben Sie uns über das [Kontaktformular](${k.links.contact}).`,
    );
  }
  if (found.includes("about") && parts.length === 0) {
    say(
      `Since 2003 the Annemarie-Schimmel-Haus has been Lahore's home for the German language and German-Pakistani dialogue, as a cooperation partner of the Goethe-Institut. [Our story](${k.links.about})`,
      `Seit 2003 ist das Annemarie-Schimmel-Haus Lahores Zuhause für die deutsche Sprache und den deutsch-pakistanischen Dialog, als Kooperationspartner des Goethe-Instituts. [Unsere Geschichte](${k.links.about})`,
    );
  }

  if (!parts.length) {
    say(
      `Good question, and one I'd rather not guess at. Our office knows for sure: ${k.contact.phone} or the [contact page](${k.links.contact}).`,
      `Gute Frage, und ich rate ungern. Unser Büro weiß es sicher: ${k.contact.phone} oder das [Kontaktformular](${k.links.contact}).`,
    );
  }
  return parts.join("\n\n");
}
