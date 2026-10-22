import type { Metadata } from "next";
import { EventForm } from "@/components/admin/programme-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { saveEventAction } from "@/server/actions/programme";
import { pickerImages } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireAdmin("content:write");
  const images = await pickerImages();
  return (
    <>
      <PageHeader eyebrow="Events" title="New event" description="Save as draft, check the preview on the website, then publish." />
      <Panel>
        <EventForm action={saveEventAction.bind(null, null)} images={images} defaults={{ startsAt: "", endsAt: "", registrationClosesAt: "" }} />
      </Panel>
    </>
  );
}
