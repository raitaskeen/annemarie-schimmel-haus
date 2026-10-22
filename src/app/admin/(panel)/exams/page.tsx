import type { Metadata } from "next";
import { ExternalLink, Trash } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { ExamDateDialog } from "@/components/admin/content-forms";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { deleteExamDateAction, saveExamDateAction } from "@/server/actions/content";
import { listExamDatesAdmin } from "@/server/admin/content";
import { getSettings } from "@/server/public/queries";

export const metadata: Metadata = { title: "Goethe exams" };

export default async function ExamsAdminPage() {
  await requireAdmin("content:write");
  const [rows, settings] = await Promise.all([listExamDatesAdmin(), getSettings()]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        eyebrow="Programme"
        title="Goethe exam dates"
        description="ASH is a Goethe exam centre, but registration and payment happen in the Goethe-Institut Karachi webshop. The website lists these dates and sends candidates there."
        actions={
          <>
            <Button asChild variant="outline">
              <a href={settings.goethe.examPortalUrl} target="_blank" rel="noreferrer">
                <ExternalLink /> Goethe webshop
              </a>
            </Button>
            <ExamDateDialog action={saveExamDateAction.bind(null, null)} />
          </>
        }
      />
      <Panel padded={false}>
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Levels</th>
                <th>Registration opens</th>
                <th>Note</th>
                <th>Website</th>
                <th className="w-0" />
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const past = (x.examEndsOn ?? x.examStartsOn) < today;
                return (
                  <tr key={x.id} className={past ? "text-muted-foreground" : undefined}>
                    <td className="whitespace-nowrap">
                      <span className="font-medium">{formatDate(x.examStartsOn, "en", { weekday: "short" })}</span>
                      {x.examEndsOn && x.examEndsOn !== x.examStartsOn && <span className="text-xs"> – {formatDate(x.examEndsOn, "en")}</span>}
                      {past && <div className="text-xs">Past</div>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {x.levels.map((l) => (
                          <span key={l} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{x.registrationOn ? formatDate(x.registrationOn, "en") : "—"}</td>
                    <td className="max-w-72 text-xs text-muted-foreground">{x.noteEn || "—"}</td>
                    <td>
                      <StatusBadge status={x.published ? "published" : "draft"} label={x.published ? "shown" : "hidden"} />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <ExamDateDialog action={saveExamDateAction.bind(null, x.id)} exam={x} />
                        <ConfirmAction action={deleteExamDateAction.bind(null, x.id)} title="Delete this exam date?" description="It disappears from the exams page." confirmLabel="Delete" destructive variant="ghost">
                          <Trash className="size-3.5" />
                        </ConfirmAction>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No exam dates yet" description="Add the dates published by the Goethe-Institut." />
        )}
      </Panel>
    </>
  );
}
