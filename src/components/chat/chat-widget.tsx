"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import { chatCopy } from "@/content/chat";
import { href, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { SchimmelMark } from "./schimmel-mark";

type Message = { id: string; role: "user" | "assistant"; content: string; error?: boolean };

const STORE = "ash-chat:v1"; // conversation, per browser tab (sessionStorage)
const SEEN = "ash-chat:seen"; // launcher badge and teaser, per browser (localStorage)
const ease = [0.22, 1, 0.36, 1] as const;

const uid = () => Math.random().toString(36).slice(2, 10);
const noSubscribe = () => () => {};

function read<T>(storage: () => Storage, key: string, fallback: T): T {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the chat simply isn't remembered.
  }
}

/**
 * Schimmel, the website assistant: a floating launcher and a chat panel (full screen on
 * phones). Answers stream from /api/chat, which uses the site's live data and an LLM
 * when one is configured.
 */
export function ChatWidget({ locale }: { locale: Locale }) {
  const t = chatCopy(locale);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // The server renders no badge; the browser shows it until Schimmel has been opened once.
  const seenBefore = useSyncExternalStore(noSubscribe, () => read(() => localStorage, SEEN, false), () => true);
  const [seenNow, setSeenNow] = useState(false);
  const seen = seenBefore || seenNow;
  const [teaser, setTeaser] = useState(false);
  const restored = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // First-time visitors get a little wave after a few seconds.
  useEffect(() => {
    if (seen) return;
    const id = window.setTimeout(() => setTeaser(true), 6000);
    return () => window.clearTimeout(id);
  }, [seen]);

  // Saved only once the stored conversation has been restored, so a fresh page never wipes it.
  useEffect(() => {
    if (!busy && restored.current) write(() => sessionStorage, STORE, messages.slice(-30));
  }, [messages, busy]);

  // Keep the newest message in view while Schimmel types.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [messages, busy, open]);

  // Phones get a full-screen sheet: lock the page behind it, close with Escape anywhere.
  useEffect(() => {
    if (!open) return;
    const phone = window.matchMedia("(max-width: 639px)").matches;
    if (phone) document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const focus = window.setTimeout(() => field.current?.focus({ preventScroll: true }), 220);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focus);
    };
  }, [open]);

  const openChat = () => {
    // The conversation of this tab comes back the first time the panel opens.
    if (!restored.current) {
      restored.current = true;
      setMessages((prev) => (prev.length ? prev : read(() => sessionStorage, STORE, [] as Message[])));
    }
    setOpen(true);
    setTeaser(false);
    if (!seen) {
      setSeenNow(true);
      write(() => localStorage, SEEN, true);
    }
  };
  const closeChat = () => {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  };

  const send = useCallback(
    async (text: string) => {
      const question = text.trim().slice(0, 1000);
      if (!question || busy) return;
      const history = messages.filter((msg) => !msg.error && msg.content).slice(-9);
      const reply: Message = { id: uid(), role: "assistant", content: "" };
      setMessages((prev) => [...prev, { id: uid(), role: "user", content: question }, reply]);
      setInput("");
      setBusy(true);
      const controller = new AbortController();
      abort.current = controller;

      const update = (patch: Partial<Message>) => setMessages((prev) => prev.map((msg) => (msg.id === reply.id ? { ...msg, ...patch } : msg)));
      const contact = `[${locale === "de" ? "Kontaktseite" : "contact page"}](${href(locale, "/contact")})`;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, messages: [...history.map(({ role, content }) => ({ role, content })), { role: "user", content: question }] }),
          signal: controller.signal,
        });
        if (res.status === 429) return update({ content: t.rateLimited, error: true });
        if (!res.ok || !res.body) return update({ content: `${t.error} ${contact}.`, error: true });
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let content = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          content += value;
          update({ content });
        }
        if (!content.trim()) update({ content: `${t.error} ${contact}.`, error: true });
      } catch {
        // A stopped answer keeps what arrived; a failed one says so.
        setMessages((prev) => prev.map((msg) => (msg.id === reply.id && !msg.content ? { ...msg, content: `${t.error} ${contact}.`, error: !controller.signal.aborted } : msg)));
      } finally {
        abort.current = null;
        setBusy(false);
      }
    },
    [busy, messages, locale, t],
  );

  const reset = () => {
    abort.current?.abort();
    setMessages([]);
    write(() => sessionStorage, STORE, []);
    field.current?.focus();
  };

  const last = messages[messages.length - 1];
  const waiting = busy && last?.role === "assistant" && !last.content;
  const closeOnPhone = () => window.matchMedia("(max-width: 639px)").matches && setOpen(false);

  return (
    <>
      {/* ------------------------------------------------------------ launcher */}
      <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex items-end gap-3 sm:right-6 sm:bottom-6">
        <AnimatePresence>
          {teaser && !open && (
            <m.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.3, ease }}
              className="relative mb-2 max-w-60 rounded-2xl rounded-br-md bg-white px-4 py-3 pr-8 text-sm leading-snug text-ink shadow-[0_18px_40px_-20px_rgb(16_36_28/0.6)] ring-1 ring-ink/10"
            >
              <button type="button" onClick={openChat} className="text-left">
                {t.teaser}
              </button>
              <button type="button" onClick={() => setTeaser(false)} aria-label={t.close} className="absolute top-2 right-2 grid size-6 place-items-center rounded-full text-stone hover:bg-ink/5">
                <X className="size-3.5" />
              </button>
            </m.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!open && (
            <m.button
              ref={launcher}
              type="button"
              onClick={openChat}
              aria-label={t.launcher}
              aria-haspopup="dialog"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.3, ease }}
              className="group relative grid size-16 place-items-center rounded-full bg-cream shadow-[0_18px_40px_-14px_rgb(16_36_28/0.7)] ring-1 ring-ink/10 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-14px_rgb(16_36_28/0.75)] hover:ring-lime focus-visible:ring-2 focus-visible:ring-lime"
            >
              <span className="motion-safe:animate-float">
                <SchimmelMark className="size-12" />
              </span>
              {!seen && (
                <span className="absolute -top-0.5 -right-0.5 flex size-4" aria-hidden>
                  <span className="absolute inset-0 rounded-full bg-lime opacity-75 motion-safe:animate-ping" />
                  <span className="relative size-4 rounded-full bg-lime ring-2 ring-cream" />
                </span>
              )}
            </m.button>
          )}
        </AnimatePresence>
      </div>

      {/* --------------------------------------------------------------- panel */}
      <AnimatePresence>
        {open && (
          <m.section
            role="dialog"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.32, ease }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-cream shadow-[0_40px_90px_-30px_rgb(16_36_28/0.7)] ring-1 ring-ink/10 sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(700px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-[1.75rem]"
          >
            {/* header */}
            <header className="relative flex items-center gap-3 overflow-hidden bg-forest px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-3.5 text-white sm:pt-3.5">
              <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.07] invert" aria-hidden />
              <span className="relative grid size-11 shrink-0 place-items-center">
                <SchimmelMark className="size-11" thinking={busy} />
              </span>
              <div className="relative min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-xl leading-tight">
                  {t.name} <span className="text-sm font-normal text-white/60">· {t.role}</span>
                </h2>
                <p className="flex items-center gap-1.5 text-xs text-white/70">
                  <span className="relative flex size-2" aria-hidden>
                    <span className="absolute inset-0 rounded-full bg-lime opacity-75 motion-safe:animate-ping" />
                    <span className="relative size-2 rounded-full bg-lime" />
                  </span>
                  {t.status}
                </p>
              </div>
              {messages.length > 0 && (
                <button type="button" onClick={reset} aria-label={t.reset} title={t.reset} className="relative grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                  <RotateCcw className="size-4" />
                </button>
              )}
              <button type="button" onClick={closeChat} aria-label={t.close} className="relative grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                <X className="size-5" />
              </button>
            </header>

            {/* conversation */}
            <div ref={scroller} className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite" aria-busy={busy}>
              <div className="grid gap-4">
                <Bubble role="assistant" onLink={closeOnPhone}>
                  {t.welcome}
                </Bubble>
                {messages.length === 0 && (
                  <m.div className="flex flex-wrap gap-2 pl-10" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}>
                    {t.suggestions.map((s) => (
                      <m.button
                        key={s}
                        type="button"
                        onClick={() => void send(s)}
                        variants={{ hidden: { opacity: 0, y: 6 }, shown: { opacity: 1, y: 0 } }}
                        className="rounded-full bg-white px-3.5 py-2 text-left text-sm text-forest ring-1 ring-ink/10 transition-colors hover:bg-mint hover:ring-ash/40"
                      >
                        {s}
                      </m.button>
                    ))}
                  </m.div>
                )}
                {messages.map((msg) =>
                  msg.role === "assistant" && !msg.content ? null : (
                    <Bubble key={msg.id} role={msg.role} error={msg.error} onLink={closeOnPhone} typing={busy && msg.id === last?.id}>
                      {msg.content}
                    </Bubble>
                  ),
                )}
                {waiting && <Thinking words={t.thinking} />}
              </div>
            </div>

            {/* composer */}
            <form
              className="border-t border-ink/10 bg-white/70 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <div className="flex items-end gap-2 rounded-2xl bg-white p-1.5 pl-3.5 ring-1 ring-ink/15 transition-[box-shadow] focus-within:ring-2 focus-within:ring-ash/60">
                <textarea
                  ref={field}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  rows={1}
                  maxLength={1000}
                  placeholder={t.placeholder}
                  aria-label={t.placeholder}
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-ink outline-none [field-sizing:content] placeholder:text-stone"
                />
                {busy ? (
                  <button type="button" onClick={() => abort.current?.abort()} aria-label={t.stop} className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-lime transition-colors hover:bg-pine">
                    <Square className="size-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label={t.send}
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-forest transition-[background-color,opacity,transform] hover:bg-forest hover:text-lime active:scale-95 disabled:opacity-40 disabled:hover:bg-lime disabled:hover:text-forest"
                  >
                    <ArrowUp className="size-5" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-stone">{t.footnote}</p>
            </form>
          </m.section>
        )}
      </AnimatePresence>
    </>
  );
}

/** One chat message. Schimmel's replies are Markdown; site links stay in the app. */
function Bubble({ role, children, error, typing, onLink }: { role: Message["role"]; children: string; error?: boolean; typing?: boolean; onLink: () => void }) {
  const mine = role === "user";
  return (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease }} className={cn("flex items-end gap-2", mine && "justify-end")}>
      {!mine && (
        <span className="grid size-8 shrink-0 place-items-center" aria-hidden>
          <SchimmelMark className="size-8" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed break-words",
          mine ? "rounded-br-md bg-forest text-white" : "rounded-bl-md bg-white text-ink shadow-[0_8px_24px_-18px_rgb(16_36_28/0.5)] ring-1 ring-ink/[0.06]",
          error && "bg-sand/70 text-forest ring-sand",
        )}
      >
        {mine ? (
          <p className="whitespace-pre-wrap">{children}</p>
        ) : (
          <div className={cn("chat-md", typing && "chat-typing")}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              components={{
                a: ({ href: to, children: c }) =>
                  to?.startsWith("/") ? (
                    <Link href={to} onClick={onLink}>
                      {c}
                    </Link>
                  ) : (
                    <a href={to} target="_blank" rel="noopener noreferrer">
                      {c}
                    </a>
                  ),
                img: () => null,
                h1: ({ children: c }) => <p className="font-semibold">{c}</p>,
                h2: ({ children: c }) => <p className="font-semibold">{c}</p>,
                h3: ({ children: c }) => <p className="font-semibold">{c}</p>,
              }}
            >
              {children}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </m.div>
  );
}

/** Schimmel is thinking: her avatar glances around while playful words roll by. */
function Thinking({ words }: { words: string[] }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * words.length));
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1 + Math.floor(Math.random() * 3)) % words.length), 1500);
    return () => window.clearInterval(id);
  }, [words.length]);
  return (
    <div className="flex items-end gap-2" role="status">
      <span className="grid size-8 shrink-0 place-items-center" aria-hidden>
        <SchimmelMark className="size-8" thinking />
      </span>
      <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-pine shadow-[0_8px_24px_-18px_rgb(16_36_28/0.5)] ring-1 ring-ink/[0.06]">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((d) => (
            <span key={d} className="size-1.5 rounded-full bg-ash motion-safe:animate-[bot-dot_1.1s_ease-in-out_infinite]" style={{ animationDelay: `${d * 0.15}s` }} />
          ))}
        </span>
        <span className="relative inline-grid overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={words[i]}
              className="col-start-1 row-start-1 font-medium whitespace-nowrap"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.35, ease }}
            >
              {words[i]}…
            </m.span>
          </AnimatePresence>
        </span>
      </div>
    </div>
  );
}
