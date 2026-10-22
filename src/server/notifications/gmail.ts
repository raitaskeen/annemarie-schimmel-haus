import "server-only";
import { randomBytes } from "node:crypto";
import { env, gmailConfigured } from "@/lib/env";

/**
 * Gmail API sender (users.messages.send) authenticated with an OAuth2 refresh
 * token of the sending Google Workspace mailbox. No SDK: two HTTPS calls.
 */
type Attachment = { filename: string; contentType: string; content: string | Buffer };
export type EmailMessage = { to: string; subject: string; html: string; text: string; replyTo?: string; attachments?: Attachment[] };

let token: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const e = env();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: e.GMAIL_CLIENT_ID!,
      client_secret: e.GMAIL_CLIENT_SECRET!,
      refresh_token: e.GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google OAuth: ${data.error ?? res.status}`);
  token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

/** RFC 2047 encoded-word for non-ASCII headers. */
function encodeHeader(value: string) {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function wrap76(b64: string) {
  return b64.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

/** Strips CR/LF so user-controlled values can never inject headers. */
const safe = (v: string) => v.replace(/[\r\n]+/g, " ").trim();

export function buildMime(msg: EmailMessage, from: string): string {
  const alt = `alt_${randomBytes(12).toString("hex")}`;
  const mixed = `mix_${randomBytes(12).toString("hex")}`;
  const headers = [
    `From: ${from}`,
    `To: ${safe(msg.to)}`,
    `Subject: ${encodeHeader(safe(msg.subject))}`,
    "MIME-Version: 1.0",
    ...(msg.replyTo ? [`Reply-To: ${safe(msg.replyTo)}`] : []),
  ];
  const alternative = [
    `--${alt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(msg.text, "utf8").toString("base64")),
    `--${alt}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(msg.html, "utf8").toString("base64")),
    `--${alt}--`,
  ].join("\r\n");

  if (!msg.attachments?.length) {
    return [...headers, `Content-Type: multipart/alternative; boundary="${alt}"`, "", alternative].join("\r\n");
  }
  const parts = msg.attachments.map((a) =>
    [
      `--${mixed}`,
      `Content-Type: ${a.contentType}; name="${safe(a.filename)}"`,
      `Content-Disposition: attachment; filename="${safe(a.filename)}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(Buffer.from(a.content).toString("base64")),
    ].join("\r\n"),
  );
  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    "",
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    alternative,
    ...parts,
    `--${mixed}--`,
  ].join("\r\n");
}

export async function sendEmail(msg: EmailMessage): Promise<{ id: string }> {
  if (!gmailConfigured()) throw new NotConfiguredError("Gmail API is not configured");
  const e = env();
  const from = `${encodeHeader(e.GMAIL_SENDER_NAME)} <${e.GMAIL_SENDER}>`;
  const raw = Buffer.from(buildMime(msg, from), "utf8").toString("base64url");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) throw new Error(`Gmail: ${data.error?.message ?? res.status}`);
  return { id: data.id };
}

export class NotConfiguredError extends Error {}
