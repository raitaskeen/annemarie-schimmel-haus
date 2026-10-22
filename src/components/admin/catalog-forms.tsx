"use client";

import { useState } from "react";
import { AdminForm, BilingualField, FormSection, SelectField, SubmitButton, SwitchField, TextAreaField, TextField, type ActionState } from "./form";
import { ImagePicker, type PickerImage } from "./image-picker";
import type { Course, CourseOffering } from "@/db/schema";
import { cn } from "@/lib/utils";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

export function CourseForm({ action, course, images }: { action: Action; course?: Course | null; images: PickerImage[] }) {
  const [title, setTitle] = useState(course?.titleEn ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const slugTouched = !!course;
  return (
    <AdminForm action={action} className="grid gap-8">
      {(state) => (
        <>
          <FormSection title="Identity" description="How the level appears in the catalogue and URL.">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Code" name="code" defaultValue={course?.code} state={state} required placeholder="A1, B2.1 …" />
              <SelectField label="CEFR level" name="level" defaultValue={course?.level ?? "A1"} required state={state} options={["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => ({ value: l, label: l }))} />
              <TextField label="Sort order" name="sortOrder" type="number" defaultValue={course?.sortOrder ?? 10} state={state} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                label="Title (English)"
                name="titleEn"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(e.target.value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80));
                }}
                state={state}
                required
              />
              <TextField label="Title (German)" name="titleDe" defaultValue={course?.titleDe} state={state} hint="Optional: English is shown if empty." />
            </div>
            <TextField label="URL slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} state={state} hint={`Page address: /en/courses/${slug || "…"}`} required />
            <BilingualField label="Tagline" name="tagline" values={{ en: course?.taglineEn, de: course?.taglineDe }} state={state} />
          </FormSection>

          <FormSection title="Content" description="Supports Markdown for bold text, lists and links.">
            <BilingualField label="Summary" name="summary" values={{ en: course?.summaryEn, de: course?.summaryDe }} state={state} multiline rows={3} />
            <BilingualField label="Description" name="description" values={{ en: course?.descriptionEn, de: course?.descriptionDe }} state={state} markdown rows={10} />
            <div className="grid gap-4 lg:grid-cols-2">
              <TextAreaField label="Learning outcomes (English), one per line" name="outcomesEn" defaultValue={(course?.outcomesEn ?? []).join("\n")} state={state} />
              <TextAreaField label="Learning outcomes (German), one per line" name="outcomesDe" defaultValue={(course?.outcomesDe ?? []).join("\n")} state={state} />
            </div>
            <ImagePicker name="imagePath" defaultValue={course?.imagePath} images={images} label="Cover image" />
          </FormSection>

          <FormSection title="Format & fees" description="Default values for every batch of this level.">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Teaching units" name="units" type="number" defaultValue={course?.units ?? 160} state={state} required />
              <TextField label="Weeks" name="weeks" type="number" defaultValue={course?.weeks ?? 11} state={state} required />
              <TextField label="Minutes per day" name="minutesPerDay" type="number" defaultValue={course?.minutesPerDay ?? 150} state={state} required />
              <TextField label="Course fee (PKR)" name="feePkr" type="number" defaultValue={course?.feePkr ?? 0} state={state} required />
              <TextField label="Textbook" name="bookTitle" defaultValue={course?.bookTitle} state={state} />
              <TextField label="Book fee (PKR)" name="bookFeePkr" type="number" defaultValue={course?.bookFeePkr ?? ""} state={state} />
            </div>
            <SwitchField label="Placement test required for external learners" name="requiresPlacement" defaultChecked={course?.requiresPlacement ?? false} hint="Shows a notice in the application form." />
            <SwitchField label="Published" name="published" defaultChecked={course?.published ?? true} hint="Unpublished courses disappear from the website." />
          </FormSection>

          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
              <SubmitButton>{course ? "Save course" : "Create course"}</SubmitButton>
            </div>
          </div>
        </>
      )}
    </AdminForm>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function WeekdayPicker({ defaultValue, error }: { defaultValue: number[]; error?: string }) {
  const [days, setDays] = useState<number[]>(defaultValue);
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold">Weekdays</span>
      <input type="hidden" name="weekdays" value={days.join(",")} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weekdays">
        {DAYS.map((d, i) => {
          const n = i + 1;
          const on = days.includes(n);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => setDays((cur) => (on ? cur.filter((x) => x !== n) : [...cur, n].sort()))}
              className={cn("h-9 w-12 rounded-lg border text-xs font-semibold transition-colors", on ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {d}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function OfferingForm({
  action,
  offering,
  courses,
  defaults,
}: {
  action: Action;
  offering?: CourseOffering | null;
  courses: { id: string; code: string; titleEn: string; feePkr: number }[];
  defaults: { registrationOpensAt: string; registrationClosesAt: string };
}) {
  return (
    <AdminForm action={action} className="grid gap-8">
      {(state) => (
        <>
          <FormSection title="Batch" description="Which course, in which format, under which code.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Course" name="courseId" defaultValue={offering?.courseId ?? courses[0]?.id} required state={state} options={courses.map((c) => ({ value: c.id, label: `${c.code} · ${c.titleEn}` }))} />
              <TextField label="Batch code" name="code" defaultValue={offering?.code} placeholder="A1-ONL-ST-2611" state={state} required hint="Unique; shown on invoices and in the tracker." />
              <SelectField label="Format" name="mode" defaultValue={offering?.mode ?? "on_campus"} required state={state} options={[{ value: "on_campus", label: "On campus" }, { value: "online", label: "Online (Zoom)" }]} />
              <SelectField
                label="Track"
                name="track"
                defaultValue={offering?.track ?? "standard"}
                required
                state={state}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "intensive", label: "Intensive" },
                  { value: "superintensive", label: "Superintensive" },
                  { value: "weekend", label: "Weekend" },
                ]}
              />
            </div>
          </FormSection>
          <FormSection title="Schedule" description="All times are Lahore time (PKT).">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Starts on" name="startsOn" type="date" defaultValue={offering?.startsOn} state={state} required />
              <TextField label="Ends on" name="endsOn" type="date" defaultValue={offering?.endsOn ?? ""} state={state} />
              <TextField label="Class starts" name="startTime" type="time" defaultValue={offering?.startTime?.slice(0, 5) ?? "09:30"} state={state} required />
              <TextField label="Class ends" name="endTime" type="time" defaultValue={offering?.endTime?.slice(0, 5) ?? "12:00"} state={state} required />
            </div>
            <WeekdayPicker defaultValue={offering?.weekdays ?? [1, 2, 3, 4, 5]} error={state?.fieldErrors?.weekdays} />
          </FormSection>
          <FormSection title="Seats & registration" description="Registration closes automatically when the batch is full, further applicants join the waitlist.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Capacity" name="capacity" type="number" defaultValue={offering?.capacity ?? 20} state={state} required hint={offering ? `${offering.seatsTaken} seats already reserved` : undefined} />
              <TextField label="Fee override (PKR)" name="feePkr" type="number" defaultValue={offering?.feePkr ?? ""} state={state} hint="Leave empty to use the course fee." />
              <TextField label="Registration opens" name="registrationOpensAt" type="datetime-local" defaultValue={defaults.registrationOpensAt} state={state} />
              <TextField label="Registration closes" name="registrationClosesAt" type="datetime-local" defaultValue={defaults.registrationClosesAt} state={state} />
            </div>
            <SelectField
              label="Status"
              name="status"
              defaultValue={offering?.status ?? "draft"}
              required
              state={state}
              hint="Only “open” batches accept applications. Drafts are hidden from the website."
              options={[
                { value: "draft", label: "Draft (hidden)" },
                { value: "open", label: "Open for applications" },
                { value: "closed", label: "Closed (in progress / full)" },
                { value: "cancelled", label: "Cancelled" },
                { value: "completed", label: "Completed" },
              ]}
            />
            <BilingualField label="Note shown with the batch" name="notes" values={{ en: offering?.notesEn, de: offering?.notesDe }} state={state} />
          </FormSection>
          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
              <SubmitButton>{offering ? "Save batch" : "Create batch"}</SubmitButton>
            </div>
          </div>
        </>
      )}
    </AdminForm>
  );
}
