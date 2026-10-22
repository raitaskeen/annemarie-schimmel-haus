import type { Metadata } from "next";
import { PlacementSessionForm } from "@/components/admin/programme-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { savePlacementSessionAction } from "@/server/actions/programme";

export const metadata: Metadata = { title: "New placement test" };

export default async function NewPlacementSessionPage() {
  await requireAdmin("content:write");
  return (
    <>
      <PageHeader eyebrow="Placement tests" title="New test session" description="Open sessions appear on the placement-test page with their remaining seats." />
      <Panel>
        <PlacementSessionForm action={savePlacementSessionAction.bind(null, null)} defaults={{ startsAt: "", endsAt: "", registrationDeadline: "" }} />
      </Panel>
    </>
  );
}
