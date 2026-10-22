/**
 * Normalisers shared by forms, server validation, the seed and tests.
 * Pure functions — safe to import on the client and the server.
 */

/** Application numbers, e.g. ASH-E-7K3M9Q (E = enrollment, V = event, P = placement, M = message). */
export const referencePattern = /^ASH-[EVPM]-[2-9A-HJKMNP-Z]{6}$/;

/**
 * Normalises phone numbers to E.164.
 * Pakistani formats (0300 1234567, 92300…, +92 300-1234567) and any
 * international number written with a leading + are accepted.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+") || raw.startsWith("00");
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (!hasPlus && /^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  if (!hasPlus && /^923\d{9}$/.test(digits)) return `+${digits}`;
  if (!hasPlus && /^3\d{9}$/.test(digits)) return `+92${digits}`;
  if (hasPlus && /^[1-9]\d{7,14}$/.test(digits)) {
    if (digits.startsWith("92") && !/^923\d{9}$/.test(digits) && !/^92[1-9]\d{8,9}$/.test(digits)) return null;
    return `+${digits}`;
  }
  return null;
}

/** Pakistani CNIC: 13 digits, stored as 12345-1234567-1. */
export function normalizeCnic(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!/^\d{13}$/.test(digits)) return null;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** Collapses internal whitespace and trims; NFC-normalises Unicode. */
export function cleanText(input: string): string {
  return input.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim();
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"•".repeat(Math.max(2, user.length - visible.length))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${phone.startsWith("+") ? "+" : ""}${digits.slice(0, 2)} ••• ••${digits.slice(-3)}`;
}

export function maskCnic(cnic: string): string {
  return `${cnic.slice(0, 5)}-•••••••-${cnic.slice(-1)}`;
}
