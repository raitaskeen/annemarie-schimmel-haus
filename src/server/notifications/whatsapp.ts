import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, whatsappConfigured } from "@/lib/env";
import { NotConfiguredError } from "./gmail";

/**
 * WhatsApp Business Cloud API. Business-initiated messages must use templates
 * approved in Meta Business Manager; the names and parameter order used here
 * are documented in docs/WHATSAPP_TEMPLATES.md.
 */
export type WhatsAppTemplate = { name: string; language: string; params: string[]; buttonUrlSuffix?: string };

export function toWhatsAppNumber(e164: string) {
  return e164.replace(/\D/g, "");
}

const clean = (v: string) => v.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").slice(0, 1000);

export async function sendWhatsAppTemplate(toE164: string, t: WhatsAppTemplate): Promise<{ id: string }> {
  if (!whatsappConfigured()) throw new NotConfiguredError("WhatsApp Cloud API is not configured");
  const e = env();
  const components: unknown[] = [{ type: "body", parameters: t.params.map((text) => ({ type: "text", text: clean(text) })) }];
  if (t.buttonUrlSuffix) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: t.buttonUrlSuffix }] });
  }
  const res = await fetch(`https://graph.facebook.com/${e.WHATSAPP_API_VERSION}/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${e.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toWhatsAppNumber(toE164),
      type: "template",
      template: { name: t.name, language: { code: t.language }, components },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
  if (!res.ok || !data.messages?.[0]?.id) throw new Error(`WhatsApp ${data.error?.code ?? res.status}: ${data.error?.message ?? "send failed"}`);
  return { id: data.messages[0].id };
}

/** Verifies Meta's X-Hub-Signature-256 header over the raw request body. */
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  const secret = env().WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(header.slice(7));
  return expected.length === given.length && timingSafeEqual(expected, given);
}
