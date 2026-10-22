import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { NotificationList } from "@/components/admin/activity";
import { ReplyForm } from "@/components/admin/inbox-forms";
import { NotesForm } from "@/components/admin/notes-form";
import { RowStatusMenu } from "@/components/admin/programme-forms";
import { DefinitionList, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { commonDictionary } from "@/i18n/common";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { replyToMessageAction, saveMessageNotesAction, setMessageStatusAction } from "@/server/actions/inbox";
import { getMessage } from "@/server/admin/inbox";

export const metadata: Metadata = { title: "Message" };

export default async function MessagePage(props: PageProps<"/admin/messages/[id]">) {
  await requireAdmin("messages:manage");
  const { id } = await props.params;
  const data = await getMessage(id);
  if (!data) notFound();
  const { m, sent } = data;
  const topics = commonDictionary("en").form.topics;
  const replies = sent.filter((n) => n.template === "contact.reply");
  const wa = m.phone?.replace(/\D/g, "");

  return (
    <>
      <Link href="/admin/messages" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Messages
      </Link>
      <PageHeader
        eyebrow={m.reference}
        title={m.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={m.status} /> {topics[m.topic]} · {formatDateTime(m.createdAt, "en")} · {m.locale === "de" ? "German" : "English"}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject} (${m.reference})`)}`}>
                <Mail /> Own mail app
              </a>
            </Button>
            {wa && (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                    <MessageCircle /> WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${m.phone}`}>
                    <Phone /> Call
                  </a>
                </Button>
              </>
            )}
            <RowStatusMenu
              action={setMessageStatusAction.bind(null, m.id)}
              current={m.status}
              notify={false}
              options={[
                { value: "new", label: "Mark as new" },
                { value: "in_progress", label: "In progress" },
                { value: "answered", label: "Answered" },
                { value: "closed", label: "Close" },
              ]}
            />
          </>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <Panel title={`From ${m.name}`}>
            <p className="text-sm leading-relaxed whitespace-pre-line">{m.message}</p>
          </Panel>
          {replies.length > 0 && (
            <Panel title="Replies sent">
              <ol className="grid gap-4">
                {replies.map((r) => (
                  <li key={r.id} className="rounded-xl border bg-muted/30 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge status={r.status} /> {String((r.payload as { staffName?: string }).staffName ?? "")} · {formatDateTime(r.sentAt ?? r.createdAt, "en")}
                    </div>
                    <p className="text-sm whitespace-pre-line">{String((r.payload as { body?: string }).body ?? "")}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
          <Panel title="Reply" description={`Sent to ${m.email}${m.locale === "de" ? " — the visitor wrote in German" : ""}`}>
            <ReplyForm action={replyToMessageAction.bind(null, m.id)} name={m.name.split(" ")[0]} locale={m.locale} />
          </Panel>
        </div>
        <div className="grid gap-6">
          <Panel title="Contact">
            <DefinitionList
              columns={1}
              items={[
                { label: "Name", value: m.name },
                { label: "Email", value: <a href={`mailto:${m.email}`} className="text-primary hover:underline">{m.email}</a> },
                { label: "Phone", value: m.phone ?? "—" },
              ]}
            />
          </Panel>
          <Panel title="Internal notes">
            <NotesForm action={saveMessageNotesAction.bind(null, m.id)} defaultValue={m.staffNotes ?? ""} />
          </Panel>
          <Panel title="Emails">
            <NotificationList items={sent} />
          </Panel>
        </div>
      </div>
    </>
  );
}
