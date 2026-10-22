import { Mail, MessageCircle, ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "./ui";

export function NotificationList({ items }: { items: { id: string; channel: string; template: string; recipient: string; status: string; lastError: string | null; createdAt: Date; sentAt: Date | null }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No messages sent yet.</p>;
  return (
    <ul className="grid gap-3">
      {items.map((n) => (
        <li key={n.id} className="flex gap-3 text-sm">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted">{n.channel === "email" ? <Mail className="size-3.5" /> : <MessageCircle className="size-3.5" />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{n.template}</span>
              <StatusBadge status={n.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {n.recipient} · {formatDateTime(n.sentAt ?? n.createdAt, "en")}
            </p>
            {n.lastError && n.status !== "sent" && <p className="text-xs text-muted-foreground italic">{n.lastError}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HistoryList({ items }: { items: { id: number; actorEmail: string | null; summary: string; createdAt: Date }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No changes recorded yet.</p>;
  return (
    <ol className="relative grid gap-4 border-l pl-5">
      {items.map((h) => (
        <li key={h.id} className="relative text-sm">
          <span className="absolute top-1 -left-[25px] grid size-3 place-items-center rounded-full bg-primary ring-4 ring-card" />
          <p className="font-medium">{h.summary}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ScrollText className="size-3" /> {h.actorEmail ?? "System"} · {formatDateTime(h.createdAt, "en")}
          </p>
        </li>
      ))}
    </ol>
  );
}
