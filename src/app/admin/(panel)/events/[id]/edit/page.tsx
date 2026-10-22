import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { EventForm } from "@/components/admin/programme-forms";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { deleteEventAction, saveEventAction } from "@/server/actions/programme";
import { toPktInput } from "@/server/admin/action-utils";
import { pickerImages } from "@/server/admin/catalog";
import { getEventAdmin } from "@/server/admin/programme";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage(props: PageProps<"/admin/events/[id]/edit">) {
  await requireAdmin("content:write");
  const { id } = await props.params;
  const [event, images] = await Promise.all([getEventAdmin(id), pickerImages()]);
  if (!event) notFound();
  return (
    <>
      <Link href={`/admin/events/${event.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Registrations
      </Link>
      <PageHeader
        eyebrow="Edit event"
        title={event.titleEn}
        description={<StatusBadge status={event.status} />}
        actions={
          <>
            {event.status === "published" && (
              <Button asChild variant="outline" size="sm">
                <a href={`/en/events/${event.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> View on website
                </a>
              </Button>
            )}
            <ConfirmAction action={deleteEventAction.bind(null, event.id)} title="Delete this event?" description="Only events without registrations can be deleted. Otherwise set the status to cancelled." confirmLabel="Delete event" destructive>
              <Trash /> Delete
            </ConfirmAction>
          </>
        }
      />
      <Panel>
        <EventForm
          action={saveEventAction.bind(null, event.id)}
          event={event}
          images={images}
          defaults={{ startsAt: toPktInput(event.startsAt), endsAt: toPktInput(event.endsAt), registrationClosesAt: toPktInput(event.registrationClosesAt) }}
        />
      </Panel>
    </>
  );
}
