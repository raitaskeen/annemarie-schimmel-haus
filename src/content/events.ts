import type { Locale } from "@/i18n/config";

const en = {
  metaTitle: "Events & culture",
  metaDescription: "Concerts, film evenings, literature, exhibitions and information sessions at Annemarie-Schimmel-Haus Lahore. Free registration.",
  eyebrow: "What's on",
  title: "Culture is a conversation.",
  lead: "Film, music, literature, exhibitions and information sessions bring German and Pakistani perspectives together, most events are free, all are open to you.",
  upcoming: "Upcoming",
  past: "From the archive",
  pastLead: "A look back at recent encounters at the Haus.",
  none: "New events are being planned. Subscribe to our newsletter to hear first.",
  register: "Register for free",
  registerTitle: "Reserve your seat",
  registerLead: "Free registration, your ticket arrives by email instantly.",
  waitlist: "Join the waitlist",
  fullNote: "This event is fully booked. Join the waitlist and we'll let you know if a seat opens up.",
  closed: "Registration for this event has closed.",
  noRegistration: "No registration needed, just drop by.",
  external: "Register on the partner's website",
  cancelled: "This event has been cancelled. We apologise for any inconvenience.",
  pastEvent: "This event has already taken place.",
  programme: "Programme",
  inCollaboration: "In collaboration with",
  cnicNote: "Required for entry. Please bring your original CNIC.",
  when: "When",
  where: "Where",
  admission: "Admission",
  seats: "Seats",
  directions: "Directions",
  share: "Share this event",
};

export type EventsCopy = typeof en;

const de: EventsCopy = {
  metaTitle: "Veranstaltungen & Kultur",
  metaDescription: "Konzerte, Filmabende, Literatur, Ausstellungen und Infoveranstaltungen im Annemarie-Schimmel-Haus Lahore. Kostenlose Anmeldung.",
  eyebrow: "Programm",
  title: "Kultur ist ein Gespräch.",
  lead: "Film, Musik, Literatur, Ausstellungen und Infoveranstaltungen bringen deutsche und pakistanische Perspektiven zusammen, die meisten Veranstaltungen sind kostenlos und offen für alle.",
  upcoming: "Demnächst",
  past: "Aus dem Archiv",
  pastLead: "Ein Rückblick auf die jüngsten Begegnungen im Haus.",
  none: "Neue Veranstaltungen sind in Planung. Abonnieren Sie unseren Newsletter, um es zuerst zu erfahren.",
  register: "Kostenlos anmelden",
  registerTitle: "Platz reservieren",
  registerLead: "Kostenlose Anmeldung: Ihr Ticket kommt sofort per E-Mail.",
  waitlist: "Auf die Warteliste",
  fullNote: "Diese Veranstaltung ist ausgebucht. Tragen Sie sich in die Warteliste ein, wir melden uns, wenn ein Platz frei wird.",
  closed: "Die Anmeldung für diese Veranstaltung ist geschlossen.",
  noRegistration: "Keine Anmeldung nötig, kommen Sie einfach vorbei.",
  external: "Auf der Partnerseite anmelden",
  cancelled: "Diese Veranstaltung wurde abgesagt. Wir bitten um Ihr Verständnis.",
  pastEvent: "Diese Veranstaltung hat bereits stattgefunden.",
  programme: "Programm",
  inCollaboration: "In Zusammenarbeit mit",
  cnicNote: "Für den Einlass erforderlich. Bitte bringen Sie Ihre Original-CNIC mit.",
  when: "Wann",
  where: "Wo",
  admission: "Eintritt",
  seats: "Plätze",
  directions: "Anfahrt",
  share: "Veranstaltung teilen",
};

export function eventsCopy(locale: Locale): EventsCopy {
  return locale === "de" ? de : en;
}
