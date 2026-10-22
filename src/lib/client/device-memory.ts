"use client";

/**
 * What the website remembers on the visitor's own device (localStorage only,
 * never sent anywhere): unfinished form drafts for 14 days and the reference
 * numbers of applications made on this device, so nobody loses their place.
 * Identity numbers, documents, quiz answers and consent are never stored.
 */
const DRAFT_TTL_MS = 14 * 86_400_000;
const NEVER = new Set(["cnic", "humanAnswer", "humanToken", "idempotencyKey", "website", "privacyConsent", "consent"]);

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: drafts are a convenience only */
  }
}

export type Draft<V> = { values: Partial<V>; step?: number; savedAt: number };

export function loadDraft<V>(key: string): Draft<V> | null {
  const d = read<Draft<V>>(`ash-draft:${key}`);
  if (!d || Date.now() - d.savedAt > DRAFT_TTL_MS) return null;
  return d;
}

export function saveDraft<V extends Record<string, unknown>>(key: string, values: V, step?: number) {
  const clean = Object.fromEntries(Object.entries(values).filter(([k, v]) => !NEVER.has(k) && v !== undefined && v !== ""));
  if (!Object.keys(clean).length) return;
  write(`ash-draft:${key}`, { values: clean, step, savedAt: Date.now() });
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(`ash-draft:${key}`);
  } catch {
    /* ignore */
  }
}

export type RememberedApplication = { reference: string; at: number };
const APPS = "ash-my-applications";

export function rememberApplication(reference: string) {
  const list = (read<RememberedApplication[]>(APPS) ?? []).filter((a) => a.reference !== reference);
  write(APPS, [{ reference, at: Date.now() }, ...list].slice(0, 20));
}

export function rememberedApplications(): RememberedApplication[] {
  return read<RememberedApplication[]>(APPS) ?? [];
}

export function forgetApplications() {
  try {
    localStorage.removeItem(APPS);
  } catch {
    /* ignore */
  }
}
