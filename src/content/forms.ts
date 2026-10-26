import type { Locale } from "@/i18n/config";

/** Copy for submission outcomes shared by all public forms. */
const en = {
  referenceLabel: "Your application number",
  ticketLabel: "Your ticket number",
  trackLabel: "Track this application",
  keepIt: "Keep this number, together with your phone number it lets you track your application at any time.",
  errors: {
    showcase: "This is a showcase without a database, so the tracker cannot look up applications. On the live system it shows the full status timeline.",
    human: "Please answer the quick check again, the question has been refreshed.",
    rate_limited: "Too many attempts from your connection. Please wait a few minutes and try again.",
    closed: "Registration for this date has just closed. Please choose another date.",
    full: "This session has just filled up. Please choose another date.",
    duplicate: "You have already applied with these details. Use your application number to track it.",
    files: "Please check the uploaded documents.",
    generic: "Something went wrong on our side. Your data is safe, please try again in a moment.",
    validation: "Please check the highlighted fields.",
    not_found: "We couldn't find an application with this number and phone number. Please check both and try again.",
  },
  files: {
    required: "Please upload this document.",
    file_too_large: "This file is larger than 5 MB.",
    file_type: "Please upload a JPG, PNG, WebP or PDF file.",
    file_empty: "This file is empty.",
  },
  enrollment: {
    title: "Your seat is reserved!",
    waitTitle: "You're on the waitlist",
    lead: "Thank you, we've received your application. A confirmation with all details is on its way to your inbox.",
    waitLead: "This batch is currently full, so we've put you on the waitlist. We'll contact you as soon as a seat becomes available.",
    steps: [
      { title: "Review", text: "Our course office checks your application and documents on the next working day." },
      { title: "Payment", text: "You receive the payment details by email. Pay within the stated time to confirm your seat." },
      { title: "Welcome", text: "Once paid, your seat is confirmed and we send everything you need for day one." },
    ],
  },
  event: {
    title: "You're registered!",
    waitTitle: "You're on the waitlist",
    lead: "We've emailed your ticket and a calendar invitation. Show your ticket number at the entrance.",
    waitLead: "This event is fully booked, but you're on the waitlist. We'll let you know if a seat opens up.",
    steps: [
      { title: "Save the date", text: "Add the event to your calendar from the confirmation email." },
      { title: "Bring your ticket", text: "Show your ticket number or QR code from the tracker at the entrance." },
      { title: "Enjoy", text: "Arrive a little early, seats are allocated first come, first served." },
    ],
  },
  placement: {
    title: "You're registered for the test!",
    lead: "We've emailed your confirmation with date, venue and what to bring.",
    steps: [
      { title: "Prepare", text: "No special preparation needed, the test simply shows what you already know." },
      { title: "Test day", text: "Bring your original CNIC and pay the test fee at reception." },
      { title: "Result", text: "Your recommended level appears in the tracker and is sent by email." },
    ],
  },
  contact: {
    title: "Message sent",
    lead: "Thank you for writing to us. We usually reply within two working days.",
  },
};

export type FormsCopy = typeof en;

const de: FormsCopy = {
  referenceLabel: "Ihre Antragsnummer",
  ticketLabel: "Ihre Ticketnummer",
  trackLabel: "Antrag verfolgen",
  keepIt: "Bewahren Sie diese Nummer auf, zusammen mit Ihrer Telefonnummer können Sie Ihren Antrag jederzeit verfolgen.",
  errors: {
    showcase: "Dies ist eine Vorschau ohne Datenbank, daher kann der Tracker keine Anträge abrufen. Im Live-System zeigt er den vollständigen Statusverlauf.",
    human: "Bitte beantworten Sie die Prüfung erneut, die Frage wurde aktualisiert.",
    rate_limited: "Zu viele Versuche von Ihrer Verbindung. Bitte warten Sie einige Minuten.",
    closed: "Die Anmeldung für diesen Termin ist gerade geschlossen worden. Bitte wählen Sie einen anderen Termin.",
    full: "Dieser Termin ist gerade ausgebucht. Bitte wählen Sie einen anderen Termin.",
    duplicate: "Sie haben sich mit diesen Angaben bereits angemeldet. Verfolgen Sie Ihren Antrag mit Ihrer Antragsnummer.",
    files: "Bitte prüfen Sie die hochgeladenen Dokumente.",
    generic: "Bei uns ist etwas schiefgelaufen. Ihre Daten sind sicher, bitte versuchen Sie es gleich noch einmal.",
    validation: "Bitte prüfen Sie die markierten Felder.",
    not_found: "Wir konnten keinen Antrag mit dieser Nummer und Telefonnummer finden. Bitte prüfen Sie beide Angaben.",
  },
  files: {
    required: "Bitte laden Sie dieses Dokument hoch.",
    file_too_large: "Die Datei ist größer als 5 MB.",
    file_type: "Bitte laden Sie eine JPG-, PNG-, WebP- oder PDF-Datei hoch.",
    file_empty: "Die Datei ist leer.",
  },
  enrollment: {
    title: "Ihr Platz ist reserviert!",
    waitTitle: "Sie stehen auf der Warteliste",
    lead: "Vielen Dank, wir haben Ihre Anmeldung erhalten. Eine Bestätigung mit allen Details ist auf dem Weg in Ihr Postfach.",
    waitLead: "Diese Gruppe ist derzeit voll, daher stehen Sie auf der Warteliste. Wir melden uns, sobald ein Platz frei wird.",
    steps: [
      { title: "Prüfung", text: "Unser Kursbüro prüft Ihre Anmeldung und Dokumente am nächsten Werktag." },
      { title: "Zahlung", text: "Sie erhalten die Zahlungsdetails per E-Mail. Zahlen Sie fristgerecht, um Ihren Platz zu bestätigen." },
      { title: "Willkommen", text: "Nach der Zahlung ist Ihr Platz bestätigt und Sie erhalten alles für den ersten Tag." },
    ],
  },
  event: {
    title: "Sie sind angemeldet!",
    waitTitle: "Sie stehen auf der Warteliste",
    lead: "Wir haben Ihnen Ihr Ticket und eine Kalendereinladung gesendet. Zeigen Sie Ihre Ticketnummer am Eingang vor.",
    waitLead: "Die Veranstaltung ist ausgebucht, aber Sie stehen auf der Warteliste. Wir informieren Sie, sobald ein Platz frei wird.",
    steps: [
      { title: "Termin speichern", text: "Fügen Sie die Veranstaltung aus der Bestätigungs-E-Mail Ihrem Kalender hinzu." },
      { title: "Ticket mitbringen", text: "Zeigen Sie Ihre Ticketnummer oder den QR-Code aus dem Tracker am Eingang." },
      { title: "Genießen", text: "Kommen Sie etwas früher, die Plätze werden nach Ankunft vergeben." },
    ],
  },
  placement: {
    title: "Sie sind zum Test angemeldet!",
    lead: "Wir haben Ihnen die Bestätigung mit Termin, Ort und allen Hinweisen gesendet.",
    steps: [
      { title: "Vorbereitung", text: "Keine besondere Vorbereitung nötig, der Test zeigt einfach, was Sie schon können." },
      { title: "Testtag", text: "Bringen Sie Ihre Original-CNIC mit und zahlen Sie die Testgebühr am Empfang." },
      { title: "Ergebnis", text: "Ihr empfohlenes Niveau erscheint im Tracker und kommt per E-Mail." },
    ],
  },
  contact: {
    title: "Nachricht gesendet",
    lead: "Vielen Dank für Ihre Nachricht. Wir antworten in der Regel innerhalb von zwei Werktagen.",
  },
};

export function formsCopy(locale: Locale): FormsCopy {
  return locale === "de" ? de : en;
}
