import type { Metadata } from "next";
import { PostForm } from "@/components/admin/content-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { savePostAction } from "@/server/actions/content";
import { pickerImages } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "New article" };

export default async function NewPostPage() {
  await requireAdmin("content:write");
  const images = await pickerImages();
  return (
    <>
      <PageHeader eyebrow="News" title="New article" />
      <Panel>
        <PostForm action={savePostAction.bind(null, null)} images={images} publishedAt="" />
      </Panel>
    </>
  );
}
