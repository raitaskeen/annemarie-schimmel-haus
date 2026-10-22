"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { AdminForm, FormSection, SubmitButton, SwitchField, TextAreaField, TextField, type ActionState } from "./form";
import type { SiteSettings } from "@/lib/site-settings-schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SettingsForm({ action, settings }: { action: Action; settings: SiteSettings }) {
  const [days, setDays] = useState(settings.hours.days);
  const s = settings;
  return (
    <AdminForm action={action} className="grid gap-8">
      {(state) => {
        const err = (k: string) => state?.fieldErrors?.[k];
        return (
          <>
            <FormSection title="Contact" description="Shown in the header, footer, contact page and every email.">
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="General email" name="contact.generalEmail" type="email" defaultValue={s.contact.generalEmail} state={state} required />
                <TextField label="Courses email" name="contact.coursesEmail" type="email" defaultValue={s.contact.coursesEmail} state={state} required />
                <TextField label="Programme email" name="contact.programmeEmail" type="email" defaultValue={s.contact.programmeEmail} state={state} required />
                <TextField label="Phone (UAN)" name="contact.phone" defaultValue={s.contact.phone} state={state} required />
                <TextField label="Emergency phone" name="contact.emergencyPhone" defaultValue={s.contact.emergencyPhone} state={state} />
                <TextField label="WhatsApp number" name="contact.whatsapp" defaultValue={s.contact.whatsapp} state={state} hint="Digits only, e.g. 923104247822" />
              </div>
              <TextField label="Address" name="contact.address" defaultValue={s.contact.address} state={state} required />
              <TextField label="Map link" name="contact.mapUrl" type="url" defaultValue={s.contact.mapUrl} state={state} />
            </FormSection>

            <FormSection title="Opening hours" description="Lahore time. Used on the contact page and in the footer.">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Opens" name="hours.opens" type="time" defaultValue={s.hours.opens} state={state} required />
                <TextField label="Closes" name="hours.closes" type="time" defaultValue={s.hours.closes} state={state} required />
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs font-semibold">Open on</span>
                <input type="hidden" name="hours.days" value={days.join(",")} />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Open on">
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
                {err("hours.days") && <p className="text-xs text-destructive">Choose at least one day.</p>}
              </div>
            </FormSection>

            <FormSection title="Announcement bar" description="The slim bar above the header on every page.">
              <SwitchField label="Show the announcement" name="announcement.enabled" defaultChecked={s.announcement.enabled} />
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField label="Text (English)" name="announcement.textEn" defaultValue={s.announcement.textEn} state={state} maxLength={160} />
                <TextField label="Text (German)" name="announcement.textDe" defaultValue={s.announcement.textDe} state={state} maxLength={160} />
              </div>
              <TextField label="Link" name="announcement.href" defaultValue={s.announcement.href} state={state} hint="A page on this site such as /courses, or a full https:// address." />
            </FormSection>

            <FormSection title="Applications & payment" description="How course applications are handled.">
              <SwitchField label="Accept online course applications" name="enrollment.acceptingApplications" defaultChecked={s.enrollment.acceptingApplications} hint="Turn off to pause all new applications (e.g. during holidays)." />
              <TextField label="Payment window (hours)" name="enrollment.paymentWindowHours" type="number" defaultValue={s.enrollment.paymentWindowHours} state={state} required hint="Unpaid reserved seats are released automatically after this time." />
              <div className="grid gap-4 lg:grid-cols-2">
                <TextAreaField label="Payment instructions (English)" name="enrollment.paymentInstructionsEn" defaultValue={s.enrollment.paymentInstructionsEn} state={state} rows={5} />
                <TextAreaField label="Payment instructions (German)" name="enrollment.paymentInstructionsDe" defaultValue={s.enrollment.paymentInstructionsDe} state={state} rows={5} />
              </div>
            </FormSection>

            <FormSection title="Automation" description="Runs every 10 minutes. Every automatic step is recorded in the audit log and the notification outbox.">
              <SwitchField
                label="Offer free seats to the waitlist automatically"
                name="automation.autoPromoteWaitlist"
                defaultChecked={s.automation.autoPromoteWaitlist}
                hint="Event guests move up instantly. Course applicants get the payment instructions and the normal payment window."
              />
              <SwitchField
                label="Request payment as soon as someone applies"
                name="automation.autoRequestPayment"
                defaultChecked={s.automation.autoRequestPayment}
                hint="Skips the manual review step: the confirmation email already asks for payment. Leave off if you check documents first."
              />
              <SwitchField label="Payment reminder halfway through the payment window" name="automation.paymentReminders" defaultChecked={s.automation.paymentReminders} hint="Unpaid seats are released when the window ends, applicants who reported a payment are never released automatically." />
              <SwitchField label="Reminders before events, placement tests and course starts" name="automation.reminders" defaultChecked={s.automation.reminders} hint="The day before events and tests, three days before a course starts, by email and WhatsApp." />
              <SwitchField label="Close and complete batches automatically" name="automation.autoClose" defaultChecked={s.automation.autoClose} hint="Batches close on their start date, test sessions after the deadline; finished batches and their students are marked completed." />
              <SwitchField label="Morning digest to the staff inbox" name="automation.staffDigest" defaultChecked={s.automation.staffDigest} hint="Working days after 08:00: what needs attention today. Sent to STAFF_NOTIFY_EMAIL." />
              <TextField
                label="Delete uploaded documents after (days)"
                name="automation.documentRetentionDays"
                type="number"
                min={30}
                max={3650}
                defaultValue={s.automation.documentRetentionDays}
                state={state}
                hint="Counted from when an application was rejected, cancelled or completed. Data minimisation for CNIC copies and photos."
              />
            </FormSection>

            <FormSection title="Goethe exams" description="Exam registration is handled by the Goethe-Institut Karachi.">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Exam webshop link" name="goethe.examPortalUrl" type="url" defaultValue={s.goethe.examPortalUrl} state={state} required />
                <TextField label="Goethe-Institut Karachi phone" name="goethe.karachiPhone" defaultValue={s.goethe.karachiPhone} state={state} />
              </div>
            </FormSection>

            <FormSection title="Social media" description="Leave empty to hide an icon.">
              <div className="grid gap-4 sm:grid-cols-2">
                {(["facebook", "instagram", "youtube", "linkedin", "tiktok", "x"] as const).map((k) => (
                  <TextField key={k} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)} name={`social.${k}`} type="url" defaultValue={s.social[k]} state={state} />
                ))}
              </div>
            </FormSection>

            <div className="sticky bottom-4 z-10 flex justify-end">
              <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
                <SubmitButton>Save settings</SubmitButton>
              </div>
            </div>
          </>
        );
      }}
    </AdminForm>
  );
}

export function TestEmailButton({ send, disabled }: { send: () => Promise<ActionState>; disabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await send();
          if (res?.error) toast.error(res.error);
          else toast.success(res?.message ?? "Sent");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Send />} Send test email to me
    </Button>
  );
}
