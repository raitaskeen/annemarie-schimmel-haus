import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PlacementSessionForm } from "@/components/admin/programme-forms";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { deletePlacementSessionAction, savePlacementSessionAction } from "@/server/actions/programme";
import { toPktInput } from "@/server/admin/action-utils";
import { getPlacementSessionAdmin } from "@/server/admin/programme";

export const metadata: Metadata = { title: "Edit placement test" };

export default async function EditPlacementSessionPage(props: PageProps<"/admin/placement/[id]/edit">) {
  await requireAdmin("content:write");
  const { id } = await props.params;
  const data = await getPlacementSessionAdmin(id);
  if (!data) notFound();
  const { s } = data;
  return (
    <>
      <Link href={`/admin/placement/${s.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Candidates
      </Link>
      <PageHeader
        eyebrow="Edit test session"
        title={s.code}
        description={<StatusBadge status={s.status} />}
        actions={
          <ConfirmAction action={deletePlacementSessionAction.bind(null, s.id)} title="Delete this session?" description="Only sessions without applications can be deleted. Otherwise set the status to cancelled." confirmLabel="Delete session" destructive>
            <Trash /> Delete
          </ConfirmAction>
        }
      />
      <Panel>
        <PlacementSessionForm
          action={savePlacementSessionAction.bind(null, s.id)}
          session={s}
          defaults={{ startsAt: toPktInput(s.startsAt), endsAt: toPktInput(s.endsAt), registrationDeadline: toPktInput(s.registrationDeadline) }}
        />
      </Panel>
    </>
  );
}
