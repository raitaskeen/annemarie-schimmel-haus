"use server";

import { updateTag } from "next/cache";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { TAGS } from "@/lib/cache-tags";
import { confirmSubscription, submitContact, subscribe, type NewsletterResult } from "@/server/submissions/contact";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestMeta } from "@/lib/security/request";
import { submitEnrollment } from "@/server/submissions/enrollment";
import { submitEventRegistration } from "@/server/submissions/event";
import type { SubmitResult } from "@/server/submissions/guard";
import { submitPlacement } from "@/server/submissions/placement";
import { cancelByApplicant, reportPayment, type ManageResult } from "@/server/submissions/self-service";
import { trackApplication, type TrackResponse } from "@/server/submissions/track";

/**
 * Public Server Actions. Each one validates its input with the shared zod
 * schema, applies honeypot + rate limit + human check, and never trusts the
 * client for prices, capacity or status.
 */
const loc = (value: unknown): Locale => (typeof value === "string" && hasLocale(value) ? value : defaultLocale);

export async function enrollAction(locale: string, formData: FormData): Promise<SubmitResult> {
  const result = await submitEnrollment(formData, loc(locale));
  if (result.ok && !result.duplicate) {
    updateTag(TAGS.offerings);
    updateTag(`offering:${String(formData.get("offeringId"))}`);
  }
  return result;
}

export async function registerEventAction(locale: string, input: unknown): Promise<SubmitResult> {
  const result = await submitEventRegistration(input, loc(locale));
  if (result.ok && !result.duplicate) updateTag(TAGS.events);
  return result;
}

export async function placementAction(locale: string, input: unknown): Promise<SubmitResult> {
  const result = await submitPlacement(input, loc(locale));
  if (result.ok && !result.duplicate) updateTag(TAGS.placement);
  return result;
}

export async function contactAction(locale: string, input: unknown): Promise<SubmitResult> {
  return submitContact(input, loc(locale));
}

export async function newsletterAction(locale: string, input: unknown): Promise<NewsletterResult> {
  return subscribe(input, loc(locale));
}

/** Double opt-in confirmation. Requires an explicit click so link scanners cannot confirm. */
export async function confirmNewsletterAction(token: unknown): Promise<{ ok: boolean }> {
  const { ipHash } = await requestMeta();
  if (!(await rateLimit("newsletter-confirm", ipHash, { limit: 10, windowSeconds: 900 })).ok) return { ok: false };
  return { ok: typeof token === "string" && (await confirmSubscription(token)) };
}

export async function trackAction(locale: string, input: unknown): Promise<TrackResponse> {
  return trackApplication(input, loc(locale));
}

/** Self-service from the tracker; both require the signed token issued by a successful lookup. */
export async function cancelApplicationAction(locale: string, token: unknown): Promise<ManageResult> {
  const result = await cancelByApplicant(token, loc(locale));
  if (result.ok) {
    updateTag(TAGS.offerings);
    updateTag(TAGS.events);
    updateTag(TAGS.placement);
  }
  return result;
}

export async function reportPaymentAction(locale: string, token: unknown, input: unknown): Promise<ManageResult> {
  return reportPayment(token, input, loc(locale));
}
