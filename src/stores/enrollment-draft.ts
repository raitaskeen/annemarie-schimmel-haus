"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Enrollment wizard draft, kept in this browser (localStorage) so a reload, a closed
 * tab or a lost connection never loses typed answers, visitors continue where they
 * left off for 14 days. Cleared on submit. Identity numbers and documents are never stored.
 */
export type DraftValues = Record<string, string | boolean | undefined>;

type DraftState = {
  drafts: Record<string, { values: DraftValues; step: number; savedAt: number }>;
  save: (offeringId: string, values: DraftValues, step: number) => void;
  clear: (offeringId: string) => void;
};

const NEVER_PERSIST = new Set(["cnic", "humanAnswer", "humanToken", "idempotencyKey", "website", "privacyConsent"]);

export const useEnrollmentDraft = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      save: (offeringId, values, step) =>
        set((s) => ({
          drafts: {
            ...s.drafts,
            [offeringId]: {
              step,
              savedAt: Date.now(),
              values: Object.fromEntries(Object.entries(values).filter(([k]) => !NEVER_PERSIST.has(k))),
            },
          },
        })),
      clear: (offeringId) =>
        set((s) => {
          const next = { ...s.drafts };
          delete next[offeringId];
          return { drafts: next };
        }),
    }),
    {
      name: "ash-enrollment-draft",
      version: 2,
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
      skipHydration: true,
    },
  ),
);
