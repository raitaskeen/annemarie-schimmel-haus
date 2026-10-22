"use client";

/** Last-resort page when a root layout itself fails. Inline styles only: no CSS bundle may be available. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#f7f3e9", color: "#25302b", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <main style={{ maxWidth: 440 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 30, color: "#10241c" }}>Something went wrong · Etwas ist schiefgelaufen</h1>
          <p style={{ color: "#5b655d" }}>Please try again in a moment. · Bitte versuchen Sie es gleich noch einmal.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, height: 48, padding: "0 26px", border: 0, borderRadius: 999, background: "#10241c", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 18, fontSize: 12, color: "#5b655d" }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
