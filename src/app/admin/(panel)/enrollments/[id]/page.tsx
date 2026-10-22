import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Mail, MessageCircle, Phone } from "lucide-react";
import { HistoryList, NotificationList } from "@/components/admin/activity";
import { NotesForm } from "@/components/admin/notes-form";
import { StatusActions, type StatusOption } from "@/components/admin/status-actions";
import { DefinitionList, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { commonDictionary } from "@/i18n/common";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { saveEnrollmentNotesAction, updateEnrollmentStatusAction } from "@/server/actions/enrollments";
import { getEnrollment, TRANSITIONS, type EnrollmentStatus } from "@/server/admin/enrollments";

export const metadata: Metadata = { title: "Application" };

const OPTIONS: Record<EnrollmentStatus, Omit<StatusOption, "status">> = {
  payment_pending: { label: "Request payment", description: "Sends the payment instructions and asks the applicant to pay within the payment window.", tone: "primary" },
  confirmed: { label: "Confirm payment & seat", description: "Marks the fee as paid and confirms the seat. The applicant receives a welcome message.", tone: "primary", askPaymentRef: true },
  waitlisted: { label: "Move to waitlist", description: "Releases the seat and keeps the applicant on the waitlist." },
  submitted: { label: "Reopen as new application", description: "Reserves a seat again (if available) and returns the application to review." },
  completed: { label: "Mark course completed", description: "The applicant completed the course; the certificate can be issued." },
  rejected: { label: "Reject application", description: "Releases the seat. The applicant is informed politely.", tone: "danger" },
  cancelled: { label: "Cancel application", description: "Releases the seat, e.g. when the payment window has passed.", tone: "danger" },
};

const DOC_LABELS: Record<string, string> = { photo: "Photograph", cnicFront: "CNIC, front", cnicBack: "CNIC, back", degree: "Last degree" };

export default async function EnrollmentPage(props: PageProps<"/admin/enrollments/[id]">) {
  const user = await requireAdmin("submissions:read");
  const { id } = await props.params;
  const data = await getEnrollment(id);
  if (!data) notFound();
  const { e, o, c } = data;
  const dict = commonDictionary("en");
  const writable = can(user.role, "submissions:write");
  const options = TRANSITIONS[e.status].map((s) => ({ status: s, ...OPTIONS[s], ...(s === "confirmed" ? { paymentRefDefault: e.paymentRef } : {}) }));
  const reported = !!e.paymentRef && (e.status === "submitted" || e.status === "payment_pending");
  const wa = e.phone.replace(/\D/g, "");

  return (
    <>
      <Link href="/admin/enrollments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All enrollments
      </Link>
      <PageHeader
        eyebrow={e.reference}
        title={`${e.firstName} ${e.lastName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.status} /> Submitted {formatDateTime(e.createdAt, "en")} · {e.locale === "de" ? "German" : "English"} · {e.whatsappOptIn ? "WhatsApp updates on" : "Email only"}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`mailto:${e.email}?subject=${encodeURIComponent(`${e.reference}: Annemarie-Schimmel-Haus`)}`}>
                <Mail /> Email
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${e.phone}`}>
                <Phone /> Call
              </a>
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <Panel title="Personal details">
            <DefinitionList
              items={[
                { label: "Full name", value: `${e.firstName} ${e.lastName}` },
                { label: "Father's / husband's name", value: e.guardianName },
                { label: "CNIC / B-Form", value: <span className="font-mono">{e.cnic}</span> },
                { label: "Date & place of birth", value: `${formatDate(e.dateOfBirth, "en")} · ${e.placeOfBirth}` },
              ]}
            />
          </Panel>
          <Panel title="Contact">
            <DefinitionList
              items={[
                { label: "Email", value: <a href={`mailto:${e.email}`} className="text-primary hover:underline">{e.email}</a> },
                { label: "Mobile / WhatsApp", value: e.phone },
                { label: "Emergency contact", value: `${e.emergencyName} · ${e.emergencyPhone}` },
                { label: "Address", value: `${e.address}, ${e.city}` },
              ]}
            />
          </Panel>
          <Panel title="Background">
            <DefinitionList
              items={[
                { label: "Education", value: dict.form.educationOptions[e.education] },
                { label: "Occupation", value: e.occupation },
                { label: "Previous German", value: dict.form.priorOptions[e.priorLearning] },
                { label: "Details", value: e.priorDetails },
                { label: "Motivation", value: <span className="font-normal whitespace-pre-line">{e.motivation}</span>, wide: true },
              ]}
            />
          </Panel>
          <Panel title="Documents" description="Stored privately; opening a file is logged">
            {data.files.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.files.map((f) => (
                  <li key={f.id} className="overflow-hidden rounded-xl border">
                    {f.contentType.startsWith("image/") ? (
                      <a href={`/files/${f.id}`} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated file */}
                        <img src={`/files/${f.id}`} alt={DOC_LABELS[f.kind] ?? f.kind} className="size-full object-contain" loading="lazy" />
                      </a>
                    ) : (
                      <a href={`/files/${f.id}`} className="grid aspect-[4/3] place-items-center bg-muted">
                        <FileText className="size-10 text-muted-foreground" />
                      </a>
                    )}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="font-medium">{DOC_LABELS[f.kind] ?? f.kind}</span>
                      <a href={`/files/${f.id}?download=1`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="size-3.5" /> {Math.round(f.size / 1024)} KB
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            )}
          </Panel>
          <Panel title="Staff notes">{writable ? <NotesForm action={saveEnrollmentNotesAction.bind(null, e.id)} defaultValue={e.staffNotes ?? ""} /> : <p className="text-sm whitespace-pre-line">{e.staffNotes || "·"}</p>}</Panel>
        </div>

        <div className="grid gap-6 xl:sticky xl:top-20">
          <Panel title="Course batch" actions={<Link href={`/admin/offerings/${o.id}`} className="text-xs font-medium text-primary hover:underline">Open batch</Link>}>
            <DefinitionList
              columns={1}
              items={[
                { label: "Course", value: `${c.code} · ${c.titleEn}` },
                { label: "Batch", value: <span className="font-mono">{o.code}</span> },
                { label: "Starts", value: formatDate(o.startsOn, "en", { weekday: "long" }) },
                { label: "Schedule", value: `${formatWeekdays(o.weekdays, "en")} · ${formatTimeRange(o.startTime, o.endTime, "en")} · ${o.mode === "online" ? "Online" : "On campus"}` },
                { label: "Seats", value: `${o.seatsTaken} / ${o.capacity} taken ${e.holdsSeat ? "· this applicant holds a seat" : ""}` },
                { label: "Amount due", value: formatPKR(e.amountDuePkr, "en") },
                { label: "Payment", value: e.paidAt ? `Paid ${formatDate(e.paidAt, "en")}${e.paymentRef ? ` · ref ${e.paymentRef}` : ""}` : reported ? `Reported by the applicant · ref ${e.paymentRef}` : "Not paid yet" },
              ]}
            />
          </Panel>
          {reported && (
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-sm">
              <p className="font-semibold text-primary">The applicant reported a payment</p>
              <p className="mt-1 text-muted-foreground">
                Transaction ID <span className="font-mono font-semibold text-foreground">{e.paymentRef}</span>. Check it against the bank or wallet statement, then use “Confirm payment &amp; seat”. Reported applications are never released automatically.
              </p>
            </div>
          )}
          {writable && (
            <Panel title="Next step">
              <StatusActions options={options} action={updateEnrollmentStatusAction.bind(null, e.id)} />
            </Panel>
          )}
          <Panel title="Messages to the applicant">
            <NotificationList items={data.messages} />
          </Panel>
          <Panel title="History">
            <HistoryList items={data.history} />
          </Panel>
        </div>
      </div>
    </>
  );
}
