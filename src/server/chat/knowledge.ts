import "server-only";
import { href, type Locale } from "@/i18n/config";
import { formatClock, formatDate, formatPKR } from "@/lib/format";
import { getCourses, getExamDates, getPlacementSessions, getSettings, getUpcomingEvents } from "@/server/public/queries";

/**
 * What Schimmel knows: the live catalogue, dates and contact details, read through the same
 * cached queries as the public pages (so the assistant never adds database load of its own).
 */
export type Knowledge = Awaited<ReturnType<typeof loadKnowledge>>;

const DAY_NAMES = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] } as const;

export async function loadKnowledge(l: Locale) {
  const [courses, placement, exams, events, settings] = await Promise.all([
    getCourses(),
    getPlacementSessions(),
    getExamDates(),
    getUpcomingEvents(8),
    getSettings(),
  ]);
  const date = (d: Date | string) => formatDate(d, l, { weekday: "short", year: undefined });
  const de = l === "de";

  const courseFacts = courses.map((c) => {
    const o = c.nextOffering;
    return {
      code: c.code,
      level: c.level,
      title: de ? c.titleDe || c.titleEn : c.titleEn,
      tagline: de ? c.taglineDe || c.taglineEn : c.taglineEn,
      weeks: c.weeks,
      units: c.units,
      fee: formatPKR(c.feePkr, l),
      requiresPlacement: c.requiresPlacement,
      href: href(l, `/courses/${c.slug}`),
      next: o
        ? {
            date: date(o.startsOn),
            mode: o.mode === "online" ? "online" : de ? "vor Ort" : "on campus",
            time: `${o.startTime.slice(0, 5)}–${o.endTime.slice(0, 5)}`,
            seatsLeft: o.seatsLeft,
            open: o.state === "open",
            href: o.state === "open" ? href(l, `/enroll/${o.id}`) : href(l, `/courses/${c.slug}`),
          }
        : null,
    };
  });

  const p = placement.find((s) => s.state === "open") ?? placement[0];
  const placementFact = p
    ? {
        date: date(p.startsAt),
        time: `${formatClock(p.startsAt, l)}–${formatClock(p.endsAt, l)}`,
        levels: p.levels.join(", "),
        fee: formatPKR(p.feePkr, l),
        deadline: date(p.registrationDeadline),
        open: p.state === "open",
      }
    : null;

  const { contact, hours, goethe } = settings;
  return {
    locale: l,
    courses: courseFacts,
    placement: placementFact,
    exams: exams.upcoming.slice(0, 4).map((e) => ({ date: date(e.examStartsOn), levels: e.levels.join(" & ") })),
    events: events
      .filter((e) => !e.cancelled)
      .slice(0, 6)
      .map((e) => ({ title: de ? e.titleDe || e.titleEn : e.titleEn, date: date(e.startsAt), time: formatClock(e.startsAt, l), venue: e.venue, href: href(l, `/events/${e.slug}`) })),
    contact: {
      phone: contact.phone,
      whatsapp: contact.whatsapp,
      email: contact.generalEmail,
      coursesEmail: contact.coursesEmail,
      programmeEmail: contact.programmeEmail,
      address: contact.address,
      mapUrl: contact.mapUrl,
      hours: `${hours.days.map((d) => DAY_NAMES[l][d]).join(", ")} ${hours.opens}–${hours.closes}`,
    },
    goethePortal: goethe.examPortalUrl,
    links: {
      courses: href(l, "/courses"),
      placement: href(l, "/placement-test"),
      exams: href(l, "/exams"),
      events: href(l, "/events"),
      track: href(l, "/track"),
      contact: href(l, "/contact"),
      about: href(l, "/about"),
      gallery: href(l, "/gallery"),
      news: href(l, "/news"),
      guidelines: href(l, "/student-guidelines"),
      privacy: href(l, "/privacy"),
    },
  };
}

/** The same facts as compact Markdown for the language model's system prompt. */
export function knowledgeAsText(k: Knowledge): string {
  const lines: string[] = [];
  lines.push("## Courses (CEFR levels, fees per course in Pakistani rupees)");
  for (const c of k.courses) {
    const next = c.next
      ? `next batch ${c.next.date}, ${c.next.time}, ${c.next.mode}, ${c.next.seatsLeft} seats left${c.next.open ? `, apply: ${c.next.href}` : ""}`
      : "no batch scheduled yet";
    lines.push(`- ${c.code} ${c.title}: ${c.weeks} weeks, ${c.units} teaching units, ${c.fee}${c.requiresPlacement ? ", placement test needed if not continuing from ASH" : ""}; ${next}. Details: ${c.href}`);
  }
  lines.push("", "## Placement test (for anyone joining above A1)");
  lines.push(
    k.placement
      ? `- Next session ${k.placement.date}, ${k.placement.time}, levels ${k.placement.levels}, fee ${k.placement.fee}, register by ${k.placement.deadline}${k.placement.open ? "" : " (currently not open)"}. Page: ${k.links.placement}`
      : `- No session scheduled right now. Page: ${k.links.placement}`,
  );
  lines.push("", "## Goethe-Institut exams (registration only via the official Goethe portal)");
  lines.push(...(k.exams.length ? k.exams.map((e) => `- ${e.date}: Goethe-Zertifikat ${e.levels}`) : ["- New dates will be announced."]));
  lines.push(`- Portal: ${k.goethePortal} · Overview: ${k.links.exams}`);
  lines.push("", "## Upcoming events (most are free, registration on the event page)");
  lines.push(...(k.events.length ? k.events.map((e) => `- ${e.date} ${e.time}: ${e.title} (${e.venue}) ${e.href}`) : ["- Nothing announced yet."]));
  lines.push("", "## Contact");
  lines.push(
    `- Phone ${k.contact.phone}, WhatsApp +${k.contact.whatsapp}, email ${k.contact.email} (courses: ${k.contact.coursesEmail}, programme: ${k.contact.programmeEmail})`,
    `- Address ${k.contact.address}. Map: ${k.contact.mapUrl}`,
    `- Office hours ${k.contact.hours}`,
  );
  lines.push("", "## Useful pages");
  lines.push(...Object.entries(k.links).map(([name, link]) => `- ${name}: ${link}`));
  return lines.join("\n");
}
