/**
 * Showcase build (NEXT_PUBLIC_SHOWCASE=1) only: stand-ins for the Server Actions in
 * src/server/actions/public.ts, swapped in by next.config.ts. The static showcase has no
 * server or database, so forms answer in the browser with a demo reference and nothing is stored.
 */
import type { NewsletterResult } from "@/server/submissions/contact";
import type { ManageResult } from "@/server/submissions/self-service";
import type { SubmitResult } from "@/server/submissions/guard";
import type { TrackResponse } from "@/server/submissions/track";

const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));
const demoRef = (kind: string) => `ASH-${kind}-DEMO${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
const ok = async (kind: string): Promise<SubmitResult> => {
  await wait();
  return { ok: true, reference: demoRef(kind), status: "submitted" };
};

export const enrollAction = (_locale: string, _form: FormData) => ok("E");
export const registerEventAction = async (_locale: string, _input: unknown): Promise<SubmitResult> => {
  await wait();
  return { ok: true, reference: demoRef("V"), status: "registered" };
};
export const placementAction = (_locale: string, _input: unknown) => ok("P");
export const contactAction = (_locale: string, _input: unknown) => ok("M");

export async function newsletterAction(_locale: string, _input: unknown): Promise<NewsletterResult> {
  await wait();
  return { ok: true } as NewsletterResult;
}

export async function confirmNewsletterAction(_token: unknown): Promise<{ ok: boolean }> {
  await wait(300);
  return { ok: true };
}

/** The tracker needs real data, so the showcase explains that instead of inventing a result. */
export async function trackAction(_locale: string, _input: unknown): Promise<TrackResponse> {
  await wait();
  return { ok: false, error: "showcase" } as unknown as TrackResponse;
}

export async function cancelApplicationAction(_locale: string, _token: unknown): Promise<ManageResult> {
  await wait();
  return { ok: false, error: "showcase" } as unknown as ManageResult;
}

export async function reportPaymentAction(_locale: string, _token: unknown, _input: unknown): Promise<ManageResult> {
  await wait();
  return { ok: false, error: "showcase" } as unknown as ManageResult;
}
