import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PartnerOrder } from "@/components/admin/content-forms";
import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { reorderPartnersAction } from "@/server/actions/content";
import { listPartnersAdmin } from "@/server/admin/content";

export const metadata: Metadata = { title: "Partners" };

export default async function PartnersAdminPage() {
  await requireAdmin("content:write");
  const rows = await listPartnersAdmin();
  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Partners"
        description="Institutions shown on the partners page and in the looping logo strip on the homepage. Use the arrows to change the order."
        actions={
          <Button asChild className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
            <Link href="/admin/partners/new">
              <Plus /> Add partner
            </Link>
          </Button>
        }
      />
      <Panel padded={false}>
        {rows.length ? <PartnerOrder partners={rows} save={reorderPartnersAction} /> : <EmptyState title="No partners yet" />}
      </Panel>
    </>
  );
}
