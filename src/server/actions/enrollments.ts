"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/cache-tags";
import { adminAction, type ActionState } from "@/server/admin/action-utils";
import { changeEnrollmentStatus, ENROLLMENT_STATUSES, saveStaffNotes } from "@/server/admin/enrollments";

const statusInput = z.object({
  status: z.enum(ENROLLMENT_STATUSES),
  note: z.string().trim().max(1000).optional().default(""),
  paymentRef: z.string().trim().max(80).optional().default(""),
  notify: z.enum(["true", "false"]).optional().default("true"),
});

export async function updateEnrollmentStatusAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    const input = statusInput.parse(Object.fromEntries(formData));
    const updated = await changeEnrollmentStatus(user, id, input.status, { note: input.note || null, paymentRef: input.paymentRef || null, notify: input.notify === "true" });
    updateTag(TAGS.offerings);
    updateTag(`offering:${updated.offeringId}`);
    return { ok: true, message: `Status changed to “${updated.status.replace("_", " ")}”${input.notify === "true" ? " — applicant notified" : ""}.` };
  });
}

export async function saveEnrollmentNotesAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    await saveStaffNotes(user, id, String(formData.get("notes") ?? ""));
    return { ok: true, message: "Notes saved." };
  });
}

const bulkInput = z.object({
  ids: z.array(z.string().uuid()).min(1, "Select at least one application.").max(100),
  status: z.enum(ENROLLMENT_STATUSES),
  notify: z.enum(["true", "false"]).optional().default("true"),
});

/** Applies one status to many applications; each change keeps its own seat check and notification. */
export async function bulkEnrollmentStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    const input = bulkInput.parse({ ids: formData.getAll("ids"), status: formData.get("status"), notify: formData.get("notify") ?? undefined });
    let done = 0;
    const skipped: string[] = [];
    for (const id of new Set(input.ids)) {
      try {
        const updated = await changeEnrollmentStatus(user, id, input.status, { notify: input.notify === "true", note: "Bulk update" });
        updateTag(`offering:${updated.offeringId}`);
        done++;
      } catch (error) {
        skipped.push(error instanceof Error ? error.message : "failed");
      }
    }
    updateTag(TAGS.offerings);
    const why = [...new Set(skipped)].slice(0, 2).join(" ");
    if (!done) return { error: `Nothing changed. ${why}` };
    return { ok: true, message: `${done} application(s) updated${skipped.length ? `, ${skipped.length} skipped (${why})` : ""}.` };
  });
}
