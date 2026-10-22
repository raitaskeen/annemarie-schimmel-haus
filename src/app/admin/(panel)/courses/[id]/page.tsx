import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Plus, Trash } from "lucide-react";
import { CourseForm } from "@/components/admin/catalog-forms";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { deleteCourseAction, saveCourseAction } from "@/server/actions/catalog";
import { getCourseAdmin, pickerImages } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "Edit course" };

export default async function EditCoursePage(props: PageProps<"/admin/courses/[id]">) {
  await requireAdmin("content:write");
  const { id } = await props.params;
  const [data, images] = await Promise.all([getCourseAdmin(id), pickerImages()]);
  if (!data) notFound();
  const { course, offerings } = data;
  return (
    <>
      <PageHeader
        eyebrow={`Course ${course.code}`}
        title={course.titleEn}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/en/courses/${course.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink /> View on website
              </a>
            </Button>
            <ConfirmAction action={deleteCourseAction.bind(null, course.id)} title="Delete this course?" description="This cannot be undone. Courses with batches cannot be deleted — unpublish them instead." confirmLabel="Delete course" destructive>
              <Trash /> Delete
            </ConfirmAction>
          </>
        }
      />
      <div className="grid items-start gap-6 2xl:grid-cols-[1fr_360px]">
        <Panel>
          <CourseForm action={saveCourseAction.bind(null, course.id)} course={course} images={images} />
        </Panel>
        <Panel
          title="Batches"
          padded={false}
          actions={
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/offerings/new?course=${course.id}`}>
                <Plus /> Add batch
              </Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {offerings.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/offerings/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                  <span>
                    <span className="block font-mono text-xs font-semibold">{o.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(o.startsOn, "en")} · {o.seatsTaken}/{o.capacity} seats
                    </span>
                  </span>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            ))}
            {!offerings.length && <li className="px-5 py-6 text-sm text-muted-foreground">No batches yet.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
