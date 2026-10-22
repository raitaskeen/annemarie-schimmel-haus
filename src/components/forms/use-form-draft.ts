"use client";

import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { clearDraft, loadDraft, saveDraft } from "@/lib/client/device-memory";

/**
 * Restores an unfinished form after a reload, a closed tab or a lost connection,
 * and autosaves while typing. Returns when the draft was restored (for a notice)
 * and a `discard` to start over.
 */
export function useFormDraft<V extends FieldValues>(key: string, form: Pick<UseFormReturn<V>, "watch" | "reset" | "getValues">, enabled = true) {
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const ready = useRef(false);
  /** Set once the form was submitted: nothing may be saved after that. */
  const done = useRef(false);

  useEffect(() => {
    const draft = loadDraft<V>(key);
    if (draft) {
      form.reset({ ...form.getValues(), ...draft.values });
      // Defer so the notice renders after hydration.
      setTimeout(() => setRestoredAt(draft.savedAt), 0);
    }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // `watch` is stable across renders; depending on the `form` literal would resubscribe on
  // every keystroke and cancel the pending save. Pending changes are flushed on unmount/page hide.
  const { watch } = form;
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: Record<string, unknown> | null = null;
    const flush = () => {
      clearTimeout(timer);
      if (pending && !done.current) saveDraft(key, pending);
      pending = null;
    };
    const sub = watch((values) => {
      if (!ready.current) return;
      pending = { ...(values as Record<string, unknown>) };
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    });
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      sub.unsubscribe();
    };
  }, [watch, key, enabled]);

  return {
    restoredAt,
    discard: () => {
      clearDraft(key);
      setRestoredAt(null);
    },
    clear: () => {
      done.current = true;
      clearDraft(key);
    },
  };
}
