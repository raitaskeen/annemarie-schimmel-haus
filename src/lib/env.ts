import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once on first use. Secrets never reach the
 * client: this module is server-only and nothing here is prefixed NEXT_PUBLIC_.
 */
const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  /** 32+ random bytes; signs form tokens and encrypts TOTP secrets. */
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:4000"),
  /** Where the real client address comes from (see lib/security/request.ts). */
  IP_SOURCE: z.enum(["x-forwarded-for", "cf-connecting-ip", "x-real-ip"]).default("x-forwarded-for"),
  /** Number of reverse proxies in front of the app that append to X-Forwarded-For. */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(1).max(5).default(1),
  /** Shared secret for /api/cron/* (Authorization: Bearer …). */
  CRON_SECRET: optional,
  /** Internal inbox for new submissions. */
  STAFF_NOTIFY_EMAIL: z.union([z.literal("").transform(() => undefined), z.string().trim().email()]).optional(),

  /* Gmail API (OAuth2 refresh token of the sending Google Workspace account). */
  GMAIL_CLIENT_ID: optional,
  GMAIL_CLIENT_SECRET: optional,
  GMAIL_REFRESH_TOKEN: optional,
  GMAIL_SENDER: optional,
  GMAIL_SENDER_NAME: z.string().default("Annemarie-Schimmel-Haus"),

  /* WhatsApp Business Cloud API. */
  WHATSAPP_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_APP_SECRET: optional,
  WHATSAPP_VERIFY_TOKEN: optional,
  WHATSAPP_API_VERSION: z.string().default("v23.0"),

  /* Website assistant "Schimmel" (src/server/chat). Without a key it answers from the site's own data. */
  GROQ_API_KEY: optional,
  /** Hugging Face access token (used when no Groq key is set). */
  HF_TOKEN: optional,
  /** Overrides the provider's default model, e.g. llama-3.3-70b-versatile. */
  CHAT_MODEL: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";

export function gmailConfigured() {
  const e = env();
  return Boolean(e.GMAIL_CLIENT_ID && e.GMAIL_CLIENT_SECRET && e.GMAIL_REFRESH_TOKEN && e.GMAIL_SENDER);
}

export function whatsappConfigured() {
  const e = env();
  return Boolean(e.WHATSAPP_TOKEN && e.WHATSAPP_PHONE_NUMBER_ID);
}
