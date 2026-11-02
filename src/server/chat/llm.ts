import "server-only";
import { env } from "@/lib/env";

export type ChatTurn = { role: "user" | "assistant"; content: string };

type Provider = { name: "groq" | "huggingface"; url: string; key: string; model: string };

/** Groq first (fastest free tier), then Hugging Face's router; both speak the OpenAI chat format. */
export function chatProvider(): Provider | null {
  const e = env();
  if (e.GROQ_API_KEY)
    return { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: e.GROQ_API_KEY, model: e.CHAT_MODEL ?? "llama-3.3-70b-versatile" };
  if (e.HF_TOKEN)
    return { name: "huggingface", url: "https://router.huggingface.co/v1/chat/completions", key: e.HF_TOKEN, model: e.CHAT_MODEL ?? "meta-llama/Llama-3.1-8B-Instruct" };
  return null;
}

/**
 * Streams the model's reply as plain text deltas. Throws before the first delta if the
 * provider refuses or times out, so the caller can fall back to an offline answer.
 */
export async function* streamCompletion(provider: Provider, system: string, turns: ChatTurn[], signal: AbortSignal): AsyncGenerator<string> {
  const res = await fetch(provider.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      stream: true,
      temperature: 0.6,
      max_tokens: 600,
      messages: [{ role: "system", content: system }, ...turns],
    }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`${provider.name} answered ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      // Server-sent events: one JSON payload per "data:" line, "[DONE]" at the end.
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const delta = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Keep-alive comments and partial frames are skipped.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
