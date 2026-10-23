import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

// The human check records used nonces in Postgres; a tiny in-memory stand-in is enough here.
const usedNonces = new Set<string>();
vi.mock("@/db", () => ({
  db: () => ({
    execute: async (query: { queryChunks?: unknown[] }) => {
      const key = JSON.stringify(query.queryChunks ?? query);
      if (usedNonces.has(key)) return { rows: [] };
      usedNonces.add(key);
      return { rows: [{ key }] };
    },
  }),
}));

let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

const { createChallenge, verifyChallenge } = await import("@/lib/security/human-check");
const { clientIp } = await import("@/lib/security/request");
const { buildMime } = await import("@/server/notifications/gmail");
const { renderEmail, whatsappTemplate } = await import("@/server/notifications/templates");
const { verifyWebhookSignature } = await import("@/server/notifications/whatsapp");

const answer = (c: { a: number; b: number; op: string }) => (c.op === "+" ? c.a + c.b : c.op === "−" ? c.a - c.b : c.a * c.b);

afterEach(() => vi.useRealTimers());

describe("bot quiz", () => {
  it("rejects instant, wrong, tampered, expired and replayed answers", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T10:00:00Z") });
    const c = createChallenge();
    expect(await verifyChallenge(c.token, answer(c))).toEqual({ ok: false, reason: "too_fast" });

    vi.setSystemTime(new Date("2026-10-22T10:00:10Z"));
    expect(await verifyChallenge(c.token, answer(c) + 1)).toEqual({ ok: false, reason: "wrong" });
    const [body, mac] = c.token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), a: 1, b: 1, op: "+" })).toString("base64url");
    expect(await verifyChallenge(`${forged}.${mac}`, 2)).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyChallenge("garbage", 1)).toEqual({ ok: false, reason: "invalid" });

    expect(await verifyChallenge(c.token, answer(c))).toEqual({ ok: true });
    expect(await verifyChallenge(c.token, answer(c))).toEqual({ ok: false, reason: "replayed" });

    vi.setSystemTime(new Date("2026-10-22T10:30:00Z"));
    const late = createChallenge();
    vi.setSystemTime(new Date("2026-10-22T10:51:00Z"));
    expect(await verifyChallenge(late.token, answer(late))).toEqual({ ok: false, reason: "expired" });
  });
});

describe("client address for rate limits", () => {
  it("uses the hop added by our proxy, not a spoofed first entry", async () => {
    requestHeaders = new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
    expect(await clientIp()).toBe("203.0.113.9");
    requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.9" });
    expect(await clientIp()).toBe("203.0.113.9");
  });

  it("ignores Cloudflare's header unless configured", async () => {
    requestHeaders = new Headers({ "cf-connecting-ip": "6.6.6.6", "x-forwarded-for": "198.51.100.4" });
    expect(await clientIp()).toBe("198.51.100.4");
  });

  it("falls back to loopback without any header", async () => {
    requestHeaders = new Headers();
    expect(await clientIp()).toBe("127.0.0.1");
  });
});

describe("email", () => {
  it("cannot be used for header injection", () => {
    const mime = buildMime({ to: "a@example.com\r\nBcc: victim@example.com", subject: "Hi\r\nBcc: victim@example.com", html: "<p>x</p>", text: "x" }, "ASH <info@example.com>");
    const headerBlock = mime.split("\r\n\r\n")[0];
    expect(headerBlock).not.toMatch(/^Bcc:/m);
  });

  it("escapes applicant input in templates", () => {
    const { html, subject } = renderEmail(
      "contact.received",
      { name: '<img src=x onerror="alert(1)">', reference: "ASH-M-ABCDEF", subject: "<script>alert(1)</script>" },
      "en",
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(subject).toContain("ASH-M-ABCDEF");
  });

  it("renders German when the applicant wrote in German", () => {
    const { subject } = renderEmail("contact.received", { name: "Sara", reference: "ASH-M-ABCDEF", subject: "Kurs" }, "de");
    expect(subject).toMatch(/Nachricht/);
  });

  it("carries the brand frame: watermark, signature and a plain-text alternative", () => {
    const { html, text } = renderEmail(
      "enrollment.payment_reported",
      { name: "Sara", reference: "ASH-C-7K3M9Q", trackUrl: "https://example.test/en/track?ref=ASH-C-7K3M9Q", course: "German A1", paymentRef: "TRX-1" },
      "en",
    );
    expect(html).toContain("/email/watermark.png");
    expect(html).toContain("/email/seal.png");
    expect(html).toContain("prefers-color-scheme:dark");
    expect(html).toContain("Your team at Annemarie-Schimmel-Haus");
    expect(text).toContain("ASH-C-7K3M9Q");
    expect(text).toContain("TRX-1");
  });

  it("adds the tracker button to applicant WhatsApp templates only", () => {
    const applicant = whatsappTemplate("enrollment.payment_reported", { name: "Sara", reference: "ASH-C-7K3M9Q", trackUrl: "", course: "German A1", paymentRef: "TRX-1" }, "de");
    expect(applicant).toMatchObject({ name: "ash_application_status", language: "de", buttonUrlSuffix: "ASH-C-7K3M9Q" });
    expect(whatsappTemplate("staff.test", { name: "Ali", sentAt: "now" }, "en")).toBeNull();
  });
});

describe("WhatsApp webhook signature", () => {
  const body = JSON.stringify({ entry: [] });
  const sign = (secret: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts Meta's signature and rejects everything else", () => {
    expect(verifyWebhookSignature(body, sign("whatsapp-app-secret-for-tests"))).toBe(true);
    expect(verifyWebhookSignature(body, sign("wrong-secret"))).toBe(false);
    expect(verifyWebhookSignature(`${body} `, sign("whatsapp-app-secret-for-tests"))).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
    expect(verifyWebhookSignature(body, "sha1=abc")).toBe(false);
  });
});

describe("tracker self-service token", async () => {
  const { issueManageToken, verifyManageToken } = await import("@/server/submissions/manage-token");

  it("is bound to one application and expires", () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T10:00:00Z") });
    const token = issueManageToken("ASH-E-7K3M9Q");
    expect(verifyManageToken(token)).toBe("ASH-E-7K3M9Q");
    vi.setSystemTime(new Date("2026-10-22T10:21:00Z"));
    expect(verifyManageToken(token)).toBeNull();
  });

  it("rejects tampered or foreign tokens", () => {
    const token = issueManageToken("ASH-V-ABCDEF");
    const [body, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ r: "ASH-E-ZZZZZZ", exp: Date.now() + 60_000 })).toString("base64url");
    expect(verifyManageToken(`${forged}.${mac}`)).toBeNull();
    // Change the signature's first character to a different one (replacing it with a fixed letter
    // would leave the token unchanged whenever the signature already starts with that letter).
    expect(verifyManageToken(`${body}.${mac[0] === "A" ? "B" : "A"}${mac.slice(1)}`)).toBeNull();
    expect(verifyManageToken("nonsense")).toBeNull();
    expect(verifyManageToken(42)).toBeNull();
  });
});
