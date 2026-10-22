import Link from "next/link";
import type { Metadata } from "next";
import { CalendarRange, Plus } from "lucide-react";
import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatPKR } from "@/lib/format";
import { listCoursesAdmin } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesAdminPage() {
  await requireAdmin("content:write");
  const rows = await listCoursesAdmin();
  return (
    <>
      <PageHeader
        eyebrow="Programme"
        title="Courses"
        description="The six CEFR levels and their default fees, books and descriptions. Batches (dates, times, seats) are managed per course."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/offerings">
                <CalendarRange /> All batches
              </Link>
            </Button>
            <Button asChild className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
              <Link href="/admin/courses/new">
                <Plus /> New course
              </Link>
            </Button>
          </>
        }
      />
      <Panel padded={false}>
        <DataTable>
          <thead>
            <tr>
              <th>Course</th>
              <th>Format</th>
              <th>Fee</th>
              <th>Batches</th>
              <th>Applications</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ course: c, batches, openBatches, applications }) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/courses/${c.id}`} className="flex items-center gap-3 font-medium hover:underline">
                    <span className="grid h-8 min-w-10 place-items-center rounded-lg bg-muted px-2 font-mono text-xs font-semibold">{c.code}</span>
                    {c.titleEn}
                  </Link>
                </td>
                <td className="text-xs text-muted-foreground">
                  {c.weeks} weeks · {c.units} units · {c.minutesPerDay / 60} h/day
                </td>
                <td className="tabular">{formatPKR(c.feePkr, "en")}</td>
                <td>
                  {batches} <span className="text-xs text-muted-foreground">({openBatches} open)</span>
                </td>
                <td className="tabular">{applications}</td>
                <td>
                  <StatusBadge status={c.published ? "published" : "draft"} label={c.published ? "Published" : "Hidden"} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </>
  );
}
