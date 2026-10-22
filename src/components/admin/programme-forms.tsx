"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, ScanLine } from "lucide-react";
import { AdminForm, BilingualField, FormSection, SelectField, SubmitButton, SwitchField, TextAreaField, TextField, type ActionState } from "./form";
import { ImagePicker, type PickerImage } from "./image-picker";
import type { Event, PlacementApplication, PlacementSession } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const CATEGORIES = [
  { value: "cultural", label: "Cultural" },
  { value: "language", label: "Language" },
  { value: "info_session", label: "Info session" },
  { value: "exhibition", label: "Exhibition" },
  { value: "music", label: "Music" },
  { value: "film", label: "Film" },
  { value: "literature", label: "Literature" },
  { value: "workshop", label: "Workshop" },
  { value: "community", label: "Community" },
];

/* ------------------------------------------------------------------- events */

export function EventForm({ action, event, images, defaults }: { action: Action; event?: Event | null; images: PickerImage[]; defaults: { startsAt: string; endsAt: string; registrationClosesAt: string } }) {
  const [title, setTitle] = useState(event?.titleEn ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [mode, setMode] = useState(event?.registrationMode ?? "internal");
  const [free, setFree] = useState(event?.isFree ?? true);
  return (
    <AdminForm action={action} className="grid gap-8">
      {(state) => (
        <>
          <FormSection title="Event" description="Title, type and visibility on the website.">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                label="Title (English)"
                name="titleEn"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!event) setSlug(slugify(e.target.value));
                }}
                state={state}
                required
              />
              <TextField label="Title (German)" name="titleDe" defaultValue={event?.titleDe} state={state} hint="Optional — English is shown if empty." />
            </div>
            <TextField label="URL slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} state={state} required hint={`Page address: /en/events/${slug || "…"}`} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Category" name="category" defaultValue={event?.category ?? "cultural"} options={CATEGORIES} state={state} required />
              <SelectField
                label="Status"
                name="status"
                defaultValue={event?.status ?? "draft"}
                state={state}
                required
                hint="Drafts are hidden. Cancelled events stay visible with a notice."
                options={[
                  { value: "draft", label: "Draft (hidden)" },
                  { value: "published", label: "Published" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>
            <SwitchField label="Feature on the homepage" name="featured" defaultChecked={event?.featured ?? false} hint="The next featured event is shown large on the homepage." />
          </FormSection>

          <FormSection title="When & where" description="Lahore time (PKT).">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Starts" name="startsAt" type="datetime-local" defaultValue={defaults.startsAt} state={state} required />
              <TextField label="Ends" name="endsAt" type="datetime-local" defaultValue={defaults.endsAt} state={state} />
              <TextField label="Venue" name="venue" defaultValue={event?.venue ?? "Annemarie-Schimmel-Haus"} state={state} required />
              <TextField label="Address" name="address" defaultValue={event?.address ?? "155 Scotch Corner, Street 3, Upper Mall, Lahore"} state={state} required />
            </div>
          </FormSection>

          <FormSection title="Content" description="The summary appears on cards; the description on the event page (Markdown).">
            <BilingualField label="Summary" name="summary" values={{ en: event?.summaryEn, de: event?.summaryDe }} state={state} multiline rows={3} />
            <BilingualField label="Description" name="body" values={{ en: event?.bodyEn, de: event?.bodyDe }} state={state} markdown rows={8} />
            <ImagePicker name="imagePath" defaultValue={event?.imagePath} images={images} label="Poster / image" />
            <TextField label="Image description (alt text)" name="imageAlt" defaultValue={event?.imageAlt} state={state} hint="Describe the image for screen-reader users." />
            <TextAreaField
              label="Programme — one item per line: time | English title | German title | location"
              name="agenda"
              rows={6}
              defaultValue={(event?.agenda ?? []).map((a) => [a.time, a.titleEn, a.titleDe ?? "", a.location ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n")}
              state={state}
              hint="Example: 10:00 | Welcome | Begrüßung | Garden"
            />
            <TextField label="Collaborators (comma separated)" name="collaborators" defaultValue={(event?.collaborators ?? []).join(", ")} state={state} hint="E.g. Goethe-Institut, Consulate General" />
          </FormSection>

          <FormSection title="Registration" description="Internal registrations get a ticket number, QR code and reminders.">
            <SelectField
              label="Registration"
              name="registrationMode"
              defaultValue={mode}
              state={state}
              required
              options={[
                { value: "internal", label: "On this website (tickets & check-in)" },
                { value: "external", label: "External link" },
                { value: "none", label: "No registration — just come" },
              ]}
            />
            {/* Mirror the select so dependent fields react without a controlled select */}
            <ModeWatcher onChange={setMode} />
            {mode === "external" && <TextField label="Registration link" name="externalUrl" type="url" defaultValue={event?.externalUrl} state={state} placeholder="https://" required />}
            {mode !== "external" && <input type="hidden" name="externalUrl" value="" />}
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Seat limit" name="capacity" type="number" defaultValue={event?.capacity ?? ""} state={state} hint={event ? `${event.seatsTaken} seats taken · empty = unlimited` : "Empty = unlimited"} />
              <TextField label="Registration closes" name="registrationClosesAt" type="datetime-local" defaultValue={defaults.registrationClosesAt} state={state} className="sm:col-span-2" />
              <TextField label="Guests per registration" name="maxGuests" type="number" defaultValue={event?.maxGuests ?? 0} state={state} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start justify-between gap-4 rounded-xl border p-3">
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">Free admission</span>
                  <span className="text-xs text-muted-foreground">Turn off to show a ticket price.</span>
                </span>
                <input type="hidden" name="isFree" value={free ? "true" : "false"} />
                <Switch checked={free} onCheckedChange={setFree} />
              </label>
              <SwitchField label="CNIC required at entry" name="requiresCnic" defaultChecked={event?.requiresCnic ?? false} hint="E.g. events with consulate guests." />
            </div>
            {!free ? <TextField label="Ticket price (PKR)" name="feePkr" type="number" defaultValue={event?.feePkr ?? ""} state={state} /> : <input type="hidden" name="feePkr" value="" />}
          </FormSection>

          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
              <SubmitButton>{event ? "Save event" : "Create event"}</SubmitButton>
            </div>
          </div>
        </>
      )}
    </AdminForm>
  );
}

/** Listens to the closest form's registrationMode select. */
function ModeWatcher({ onChange }: { onChange: (v: Event["registrationMode"]) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const select = ref.current?.closest("form")?.querySelector<HTMLSelectElement>('select[name="registrationMode"]');
    if (!select) return;
    const handler = () => onChange(select.value as Event["registrationMode"]);
    select.addEventListener("change", handler);
    return () => select.removeEventListener("change", handler);
  }, [onChange]);
  return <span ref={ref} hidden />;
}

/** Compact per-row status menu; every choice posts to the bound Server Action. */
export function RowStatusMenu({ action, current, options, notify = true }: { action: Action; current: string; options: { value: string; label: string; danger?: boolean }[]; notify?: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.ok) {
      if (state.message) toast.success(state.message);
      router.refresh();
    }
  }, [state, router]);
  const choices = options.filter((o) => o.value !== current);
  return (
    <form ref={formRef} action={formAction}>
      <input ref={statusRef} type="hidden" name="status" />
      <input type="hidden" name="notify" value={notify ? "true" : "false"} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" disabled={pending} className="h-8 gap-1 px-2 text-xs">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Change <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Set status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {choices.map((o) => (
            <DropdownMenuItem
              key={o.value}
              className={cn(o.danger && "text-destructive focus:text-destructive")}
              onSelect={() => {
                if (statusRef.current) statusRef.current.value = o.value;
                formRef.current?.requestSubmit();
              }}
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </form>
  );
}

/** Door check-in: type or scan the ticket number (QR scanners act as keyboards). */
export function CheckInForm({ action }: { action: Action }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <AdminForm
      action={action}
      resetOnSuccess
      onSuccess={() => inputRef.current?.focus()}
      className="flex flex-col gap-2 sm:flex-row"
    >
      {() => (
        <>
          <div className="relative flex-1">
            <ScanLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={inputRef} name="reference" placeholder="ASH-V-XXXXXX" aria-label="Ticket number" autoComplete="off" spellCheck={false} className="h-10 pl-9 font-mono uppercase" />
          </div>
          <SubmitButton icon={false} className="h-10">
            Check in
          </SubmitButton>
        </>
      )}
    </AdminForm>
  );
}

/* ------------------------------------------------------- placement sessions */

export function PlacementSessionForm({ action, session, defaults }: { action: Action; session?: PlacementSession | null; defaults: { startsAt: string; endsAt: string; registrationDeadline: string } }) {
  const [levels, setLevels] = useState<string[]>(session?.levels ?? ["A2", "B1", "B2"]);
  return (
    <AdminForm action={action} className="grid gap-8">
      {(state) => (
        <>
          <FormSection title="Session" description="One sitting of the placement test.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Code" name="code" defaultValue={session?.code} state={state} required placeholder="PT-2611-A" />
              <SelectField
                label="Status"
                name="status"
                defaultValue={session?.status ?? "draft"}
                state={state}
                required
                options={[
                  { value: "draft", label: "Draft (hidden)" },
                  { value: "open", label: "Open for registration" },
                  { value: "closed", label: "Closed" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
              <SelectField label="Format" name="mode" defaultValue={session?.mode ?? "on_campus"} state={state} required options={[{ value: "on_campus", label: "On campus" }, { value: "online", label: "Online" }]} />
              <TextField label="Venue" name="venue" defaultValue={session?.venue ?? "Annemarie-Schimmel-Haus, 155 Scotch Corner, Upper Mall, Lahore"} state={state} required />
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold">Levels tested</span>
              <input type="hidden" name="levels" value={levels.join(",")} />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Levels tested">
                {["A2", "B1", "B2", "C1"].map((l) => {
                  const on = levels.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setLevels((cur) => (on ? cur.filter((x) => x !== l) : [...cur, l].sort()))}
                      className={cn("h-9 w-14 rounded-lg border text-xs font-semibold transition-colors", on ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-muted")}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              {state?.fieldErrors?.levels && <p className="text-xs text-destructive">{state.fieldErrors.levels}</p>}
            </div>
          </FormSection>
          <FormSection title="Schedule & seats" description="Lahore time (PKT).">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Starts" name="startsAt" type="datetime-local" defaultValue={defaults.startsAt} state={state} required />
              <TextField label="Ends" name="endsAt" type="datetime-local" defaultValue={defaults.endsAt} state={state} required />
              <TextField label="Registration deadline" name="registrationDeadline" type="datetime-local" defaultValue={defaults.registrationDeadline} state={state} required />
              <TextField label="Seats" name="capacity" type="number" defaultValue={session?.capacity ?? 30} state={state} required hint={session ? `${session.seatsTaken} registered` : undefined} />
              <TextField label="Fee (PKR)" name="feePkr" type="number" defaultValue={session?.feePkr ?? 1100} state={state} required hint="Non-refundable, paid on the test day." />
            </div>
            <BilingualField label="Notes for candidates" name="notes" values={{ en: session?.notesEn, de: session?.notesDe }} state={state} multiline rows={3} />
          </FormSection>
          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
              <SubmitButton>{session ? "Save session" : "Create session"}</SubmitButton>
            </div>
          </div>
        </>
      )}
    </AdminForm>
  );
}

const PLACEMENT_STATUSES = [
  { value: "submitted", label: "Application received" },
  { value: "confirmed", label: "Seat confirmed" },
  { value: "attended", label: "Test taken" },
  { value: "no_show", label: "Did not attend" },
  { value: "completed", label: "Result published" },
  { value: "cancelled", label: "Cancelled" },
];

/** Status + result entry for one candidate. Publishing a result notifies the candidate. */
export function PlacementResultDialog({ action, application }: { action: Action; application: PlacementApplication }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(application.status);
  const [notify, setNotify] = useState(true);
  const [level, setLevel] = useState(application.resultLevel ?? "");
  const willNotify = (status !== application.status && ["confirmed", "completed", "cancelled"].includes(status)) || (status === "completed" && level !== (application.resultLevel ?? ""));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          {application.status === "attended" ? "Enter result" : "Update"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <AdminForm action={action} onSuccess={() => setOpen(false)} className="grid gap-4">
          {(state) => (
            <>
              <DialogHeader>
                <DialogTitle>
                  {application.firstName} {application.lastName}
                </DialogTitle>
                <DialogDescription>
                  {application.reference} · aiming for {application.targetLevel}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="pa-status">Status</Label>
                <select id="pa-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm">
                  {PLACEMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="pa-level">Recommended level</Label>
                  <select id="pa-level" name="resultLevel" value={level} onChange={(e) => setLevel(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm">
                    <option value="">—</option>
                    {["A1", "A2", "B1", "B2", "C1"].map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  {state?.fieldErrors?.resultLevel && <p className="text-xs text-destructive">{state.fieldErrors.resultLevel}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pa-score">Score (%)</Label>
                  <Input id="pa-score" name="resultScore" type="number" min={0} max={100} defaultValue={application.resultScore ?? ""} />
                  {state?.fieldErrors?.resultScore && <p className="text-xs text-destructive">{state.fieldErrors.resultScore}</p>}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pa-notes">Notes for the candidate (optional)</Label>
                <Input id="pa-notes" name="resultNotes" defaultValue={application.resultNotes ?? ""} maxLength={500} placeholder="E.g. strong listening, work on writing" />
              </div>
              <label className={cn("flex items-center justify-between gap-3 rounded-xl border p-3 text-sm", !willNotify && "opacity-60")}>
                <span>
                  Notify by email / WhatsApp
                  <span className="block text-xs text-muted-foreground">{willNotify ? "A message goes out for this change." : "Only sent for a confirmed seat, a new result or a cancellation."}</span>
                </span>
                <input type="hidden" name="notify" value={notify ? "true" : "false"} />
                <Switch checked={notify} onCheckedChange={setNotify} disabled={!willNotify} />
              </label>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton>Save</SubmitButton>
              </DialogFooter>
            </>
          )}
        </AdminForm>
      </DialogContent>
    </Dialog>
  );
}
