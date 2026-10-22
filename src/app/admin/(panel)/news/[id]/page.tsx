import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PostForm } from "@/components/admin/content-forms";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { deletePostAction, savePostAction } from "@/server/actions/content";
import { toPktInput } from "@/server/admin/action-utils";
import { pickerImages } from "@/server/admin/catalog";
import { getPostAdmin } from "@/server/admin/content";

export const metadata: Metadata = { title: "Article" };

export default async function PostPage(props: PageProps<"/admin/news/[id]">) {
  await requireAdmin("content:write");
  const { id } = await props.params;
  const [post, images] = await Promise.all([getPostAdmin(id), pickerImages()]);
  if (!post) notFound();
  const live = post.live;
  return (
    <>
      <Link href="/admin/news" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All articles
      </Link>
      <PageHeader
        eyebrow="Article"
        title={post.titleEn}
        description={<StatusBadge status={live ? "published" : post.status === "published" ? "queued" : "draft"} label={live ? "live" : post.status === "published" ? "scheduled" : "draft"} />}
        actions={
          <>
            {live && (
              <Button asChild variant="outline" size="sm">
                <a href={`/en/news/${post.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> View on website
                </a>
              </Button>
            )}
            <ConfirmAction action={deletePostAction.bind(null, post.id)} title="Delete this article?" description="This cannot be undone. Set it to draft to hide it instead." confirmLabel="Delete article" destructive>
              <Trash /> Delete
            </ConfirmAction>
          </>
        }
      />
      <Panel>
        <PostForm action={savePostAction.bind(null, post.id)} post={post} images={images} publishedAt={toPktInput(post.publishedAt)} />
      </Panel>
    </>
  );
}
