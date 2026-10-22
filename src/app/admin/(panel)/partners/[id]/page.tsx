import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PartnerForm } from "@/components/admin/content-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { deletePartnerAction, savePartnerAction } from "@/server/actions/content";
import { getPartnerAdmin, partnerLogoImages } from "@/server/admin/content";

export const metadata: Metadata = { title: "Partner" };

export default async function PartnerPage(props: PageProps<"/admin/partners/[id]">) {
  await requireAdmin("content:write");
  const { id } = await props.params;
  const [partner, images] = await Promise.all([getPartnerAdmin(id), partnerLogoImages()]);
  if (!partner) notFound();
  return (
    <>
      <Link href="/admin/partners" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All partners
      </Link>
      <PageHeader
        eyebrow="Partner"
        title={partner.name}
        actions={
          <ConfirmAction action={deletePartnerAction.bind(null, partner.id)} title={`Remove ${partner.name}?`} description="The logo disappears from the partners page and the homepage strip." confirmLabel="Remove partner" destructive>
            <Trash /> Remove
          </ConfirmAction>
        }
      />
      <Panel>
        <PartnerForm action={savePartnerAction.bind(null, partner.id)} partner={partner} images={images} />
      </Panel>
    </>
  );
}
