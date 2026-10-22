import type { Metadata } from "next";
import { PartnerForm } from "@/components/admin/content-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { savePartnerAction } from "@/server/actions/content";
import { partnerLogoImages } from "@/server/admin/content";

export const metadata: Metadata = { title: "Add partner" };

export default async function NewPartnerPage() {
  await requireAdmin("content:write");
  const images = await partnerLogoImages();
  return (
    <>
      <PageHeader eyebrow="Partners" title="Add partner" />
      <Panel>
        <PartnerForm action={savePartnerAction.bind(null, null)} images={images} />
      </Panel>
    </>
  );
}
