import type { Metadata } from "next";
import { CourseForm } from "@/components/admin/catalog-forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { saveCourseAction } from "@/server/actions/catalog";
import { pickerImages } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requireAdmin("content:write");
  const images = await pickerImages();
  return (
    <>
      <PageHeader eyebrow="Courses" title="New course" />
      <Panel>
        <CourseForm action={saveCourseAction.bind(null, null)} images={images} />
      </Panel>
    </>
  );
}
