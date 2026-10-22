import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Copy, ExternalLink, Trash, Users } from "lucide-react";
import { OfferingForm } from "@/components/admin/catalog-forms";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { deleteOfferingAction, duplicateOfferingAction, saveOfferingAction } from "@/server/actions/catalog";
import { toPktInput } from "@/server/admin/action-utils";
import { courseOptions, getOfferingAdmin } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "Batch" };

export default async function OfferingPage(props: PageProps<"/admin/offerings/[id]">) {
  await requireAdmin("content:write");
  const { id } = await props.params;
  const [data, courses] = await Promise.all([getOfferingAdmin(id), courseOptions()]);
  if (!data) notFound();
  const { o, c, byStatus } = data;
  const n = (s: string) => byStatus[s] ?? 0;
  return (
    <>
      <PageHeader
        eyebrow={`${c.code} · ${c.titleEn}`}
        title={o.code}
        description={<StatusBadge status={o.status} />}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/enrollments?offering=${o.id}`}>
                <Users /> Applications
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/en/enroll/${o.id}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Application form
              </a>
            </Button>
            <ConfirmAction action={duplicateOfferingAction.bind(null, o.id)} title="Duplicate this batch?" description="Creates a draft copy with the same schedule and settings, without any applications." confirmLabel="Duplicate">
              <Copy /> Duplicate
            </ConfirmAction>
            <ConfirmAction action={deleteOfferingAction.bind(null, o.id)} title="Delete this batch?" description="Only batches without applications can be deleted. Otherwise set the status to cancelled." confirmLabel="Delete batch" destructive>
              <Trash /> Delete
            </ConfirmAction>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Seats reserved" value={`${o.seatsTaken}/${o.capacity}`} tone="dark" />
        <StatCard label="New" value={n("submitted")} href={`/admin/enrollments?offering=${o.id}&status=submitted`} />
        <StatCard label="Awaiting payment" value={n("payment_pending")} href={`/admin/enrollments?offering=${o.id}&status=payment_pending`} />
        <StatCard label="Confirmed" value={n("confirmed")} tone="primary" href={`/admin/enrollments?offering=${o.id}&status=confirmed`} />
        <StatCard label="Waitlist" value={n("waitlisted")} href={`/admin/enrollments?offering=${o.id}&status=waitlisted`} />
      </div>
      <Panel>
        <OfferingForm
          action={saveOfferingAction.bind(null, o.id)}
          offering={o}
          courses={courses}
          defaults={{ registrationOpensAt: toPktInput(o.registrationOpensAt), registrationClosesAt: toPktInput(o.registrationClosesAt) }}
        />
      </Panel>
    </>
  );
}
