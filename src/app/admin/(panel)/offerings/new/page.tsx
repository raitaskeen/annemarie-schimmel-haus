import type { Metadata } from "next";
import { OfferingForm } from "@/components/admin/catalog-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { saveOfferingAction } from "@/server/actions/catalog";
import { courseOptions } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "New batch" };

export default async function NewOfferingPage(props: PageProps<"/admin/offerings/new">) {
  await requireAdmin("content:write");
  const sp = await props.searchParams;
  const courses = await courseOptions();
  const preselect = typeof sp.course === "string" ? sp.course : undefined;
  const sorted = preselect ? [...courses.filter((c) => c.id === preselect), ...courses.filter((c) => c.id !== preselect)] : courses;
  return (
    <>
      <PageHeader eyebrow="Batches" title="New course batch" description="Tip: save as draft first, then open registration when everything is ready." />
      <Panel>
        <OfferingForm action={saveOfferingAction.bind(null, null)} courses={sorted} defaults={{ registrationOpensAt: "", registrationClosesAt: "" }} />
      </Panel>
    </>
  );
}
