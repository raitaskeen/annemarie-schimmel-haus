import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications, whatsappMessages } from "@/db/schema";
import { env } from "@/lib/env";
import { verifyWebhookSignature } from "@/server/notifications/whatsapp";

const MAX_BODY = 512 * 1024;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Meta's subscription handshake. */
export async function GET(request: Request) {
  await connection();
  const token = env().WHATSAPP_VERIFY_TOKEN;
  const sp = new URL(request.url).searchParams;
  const challenge = sp.get("hub.challenge") ?? "";
  if (!token || sp.get("hub.mode") !== "subscribe" || !safeEqual(sp.get("hub.verify_token") ?? "", token) || !/^[\w-]{1,200}$/.test(challenge)) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(challenge, { headers: { "content-type": "text/plain" } });
}

const payloadSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z
                .object({
                  statuses: z
                    .array(z.object({ id: z.string().max(200), status: z.string().max(40), recipient_id: z.string().max(40).optional(), errors: z.array(z.object({ title: z.string().optional(), message: z.string().optional() })).optional() }))
                    .optional(),
                  messages: z
                    .array(z.object({ id: z.string().max(200), from: z.string().max(40), type: z.string().max(40), text: z.object({ body: z.string() }).optional() }))
                    .optional(),
                })
                .passthrough(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

/** Delivery receipts and inbound messages. Signature-verified; always answers quickly. */
export async function POST(request: Request) {
  await connection();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return new Response("Payload too large", { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response("Payload too large", { status: 413 });
  if (!verifyWebhookSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("Invalid signature", { status: 401 });

  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(JSON.parse(raw));
  } catch {
    return new Response("ok"); // Unknown shapes are acknowledged so Meta does not retry forever.
  }

  for (const change of parsed.entry.flatMap((e) => e.changes)) {
    for (const s of change.value.statuses ?? []) {
      // "sent" / "delivered" / "read" need no action; a late failure flips the outbox row so staff can see and retry it.
      if (s.status === "failed") {
        const error = s.errors?.map((e) => e.message ?? e.title).filter(Boolean).join("; ") || "Delivery failed";
        await db().update(notifications).set({ status: "failed", lastError: error.slice(0, 500) }).where(eq(notifications.providerMessageId, s.id));
      }
    }
    for (const m of change.value.messages ?? []) {
      await db()
        .insert(whatsappMessages)
        .values({ direction: "in", waId: m.from, wamid: m.id, type: m.type, body: m.text?.body.slice(0, 4000) ?? null })
        .onConflictDoNothing({ target: whatsappMessages.wamid });
    }
  }
  return new Response("ok");
}
