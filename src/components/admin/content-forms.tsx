"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash, Upload } from "lucide-react";
import { AdminForm, BilingualField, FormSection, SelectField, SubmitButton, SwitchField, TextField, type ActionState } from "./form";
import { ConfirmAction } from "./confirm-action";
import { ImagePicker, type PickerImage } from "./image-picker";
import type { ExamDate, GalleryItem, Partner, Post } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { compressImage } from "@/lib/client/compress-image";
import { GALLERY_CATEGORY_LABELS, galleryCategoryOptions } from "@/lib/gallery";
import { cn } from "@/lib/utils";

type Action = (s: ActionState, f: FormData) => Promise<ActionState>;

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

function LevelToggle({ name, levels, defaultValue, error }: { name: string; levels: string[]; defaultValue: string[]; error?: string }) {
  const [value, setValue] = useState<string[]>(defaultValue);
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold">Levels</span>
      <input type="hidden" name={name} value={value.join(",")} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Levels">
        {levels.map((l) => {
          const on = value.includes(l);
          return (
            <button
              key={l}
              type="button"
              aria-pressed={on}
              onClick={() => setValue((cur) => (on ? cur.filter((x) => x !== l) : levels.filter((x) => x === l || cur.includes(x))))}
              className={cn("h-9 w-12 rounded-lg border text-xs font-semibold transition-colors", on ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {l}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------- exam dates */

export function ExamDateDialog({ action, exam }: { action: Action; exam?: ExamDate }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {exam ? (
          <Button variant="ghost" size="sm" className="h-8 px-2" aria-label="Edit exam date">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
            <Plus /> Add exam date
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <AdminForm action={action} onSuccess={() => setOpen(false)} className="grid gap-4">
          {(state) => (
            <>
              <DialogHeader>
                <DialogTitle>{exam ? "Edit Goethe exam date" : "New Goethe exam date"}</DialogTitle>
                <DialogDescription>Candidates register in the Goethe-Institut Karachi webshop; the website links there.</DialogDescription>
              </DialogHeader>
              <LevelToggle name="levels" levels={["A1", "A2", "B1", "B2", "C1", "C2"]} defaultValue={exam?.levels ?? ["A1"]} error={state?.fieldErrors?.levels} />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Registration opens" name="registrationOn" type="date" defaultValue={exam?.registrationOn ?? ""} state={state} />
                <TextField label="Exam starts" name="examStartsOn" type="date" defaultValue={exam?.examStartsOn ?? ""} state={state} required />
                <TextField label="Exam ends" name="examEndsOn" type="date" defaultValue={exam?.examEndsOn ?? ""} state={state} />
              </div>
              <BilingualField label="Note" name="note" values={{ en: exam?.noteEn, de: exam?.noteDe }} state={state} hint="E.g. “Modular, all four modules”." />
              <SwitchField label="Show on the website" name="published" defaultChecked={exam?.published ?? true} />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton>Save</SubmitButton>
              </DialogFooter>
            </>
          )}
        </AdminForm>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------- news */

export function PostForm({ action, post, images, publishedAt }: { action: Action; post?: Post | null; images: PickerImage[]; publishedAt: string }) {
  const [title, setTitle] = useState(post?.titleEn ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  return (
    <AdminForm action={action} className="grid gap-8">
      {(state) => (
        <>
          <FormSection title="Article" description="Headline, category and address.">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                label="Headline (English)"
                name="titleEn"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!post) setSlug(slugify(e.target.value));
                }}
                state={state}
                required
              />
              <TextField label="Headline (German)" name="titleDe" defaultValue={post?.titleDe} state={state} hint="Optional: English is shown if empty." />
            </div>
            <TextField label="URL slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} state={state} required hint={`Page address: /en/news/${slug || "…"}`} />
            <SelectField
              label="Category"
              name="category"
              defaultValue={post?.category ?? "news"}
              state={state}
              required
              options={[
                { value: "news", label: "News" },
                { value: "announcement", label: "Announcement" },
                { value: "scholarship", label: "Scholarship" },
                { value: "job", label: "Job opening" },
                { value: "press", label: "Press" },
              ]}
            />
          </FormSection>
          <FormSection title="Content" description="The teaser appears in lists and link previews; the body supports Markdown.">
            <BilingualField label="Teaser" name="excerpt" values={{ en: post?.excerptEn, de: post?.excerptDe }} state={state} multiline rows={3} />
            <BilingualField label="Body" name="body" values={{ en: post?.bodyEn, de: post?.bodyDe }} state={state} markdown rows={14} />
            <ImagePicker name="imagePath" defaultValue={post?.imagePath} images={images} label="Cover image" />
          </FormSection>
          <FormSection title="Publishing" description="A future date schedules the article; it appears automatically.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Status"
                name="status"
                defaultValue={post?.status ?? "draft"}
                state={state}
                required
                options={[
                  { value: "draft", label: "Draft (hidden)" },
                  { value: "published", label: "Published" },
                ]}
              />
              <TextField label="Publish date" name="publishedAt" type="datetime-local" defaultValue={publishedAt} state={state} hint="Empty = now, when published." />
            </div>
            <SwitchField label="Pin to the top" name="pinned" defaultChecked={post?.pinned ?? false} hint="Pinned articles stay first on the news page." />
          </FormSection>
          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
              <SubmitButton>{post ? "Save article" : "Create article"}</SubmitButton>
            </div>
          </div>
        </>
      )}
    </AdminForm>
  );
}

/* ---------------------------------------------------------------- partners */

export function PartnerForm({ action, partner, images }: { action: Action; partner?: Partner | null; images: PickerImage[] }) {
  const [name, setName] = useState(partner?.name ?? "");
  const [slug, setSlug] = useState(partner?.slug ?? "");
  return (
    <AdminForm action={action} className="grid gap-8">
      {(state) => (
        <>
          <FormSection title="Partner" description="Shown on the partners page and in the homepage logo strip.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!partner) setSlug(slugify(e.target.value));
                }}
                state={state}
                required
              />
              <TextField label="Slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} state={state} required />
            </div>
            <TextField label="Website" name="url" type="url" defaultValue={partner?.url} state={state} placeholder="https://" />
            <BilingualField label="Type of partnership" name="category" values={{ en: partner?.categoryEn, de: partner?.categoryDe }} state={state} hint="E.g. “Cultural partner”, “Exam partner”." />
            <BilingualField label="Description" name="description" values={{ en: partner?.descriptionEn, de: partner?.descriptionDe }} state={state} multiline rows={3} />
            <ImagePicker name="logoPath" defaultValue={partner?.logoPath} images={images} label="Logo (transparent PNG or WebP works best)" />
            {state?.fieldErrors?.logoPath && <p className="text-xs text-destructive">{state.fieldErrors.logoPath}</p>}
          </FormSection>
          <FormSection title="Visibility">
            <div className="grid gap-3 sm:grid-cols-2">
              <SwitchField label="Show on the partners page" name="published" defaultChecked={partner?.published ?? true} />
              <SwitchField label="Show in the homepage logo strip" name="showInMarquee" defaultChecked={partner?.showInMarquee ?? true} />
            </div>
            <TextField label="Sort order" name="sortOrder" type="number" defaultValue={partner?.sortOrder ?? 100} state={state} hint="Lower numbers come first. You can also reorder from the list." />
          </FormSection>
          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
              <SubmitButton>{partner ? "Save partner" : "Add partner"}</SubmitButton>
            </div>
          </div>
        </>
      )}
    </AdminForm>
  );
}

/** Accessible reordering with up/down buttons (keyboard and touch friendly). */
export function PartnerOrder({ partners, save }: { partners: Pick<Partner, "id" | "name" | "logoPath" | "published" | "showInMarquee" | "categoryEn">[]; save: (ids: string[]) => Promise<ActionState> }) {
  const [list, setList] = useState(partners);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    setDirty(true);
  };
  return (
    <div>
      <ol className="divide-y">
        {list.map((p, i) => (
          <li key={p.id} className="flex items-center gap-4 px-5 py-3">
            <span className="w-6 text-right font-mono text-xs text-muted-foreground tabular">{i + 1}</span>
            <span className="grid h-12 w-28 shrink-0 place-items-center rounded-lg border bg-white p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
              <img src={p.logoPath} alt="" className="max-h-full max-w-full object-contain" />
            </span>
            <span className="min-w-0 flex-1">
              <a href={`/admin/partners/${p.id}`} className="font-medium hover:underline">
                {p.name}
              </a>
              <span className="block truncate text-xs text-muted-foreground">
                {p.categoryEn || "Partner"} · {p.published ? "on partners page" : "hidden"} · {p.showInMarquee ? "in logo strip" : "not in strip"}
              </span>
            </span>
            <span className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" className="size-8 p-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.name} up`}>
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="size-8 p-0" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Move ${p.name} down`}>
                <ArrowDown className="size-4" />
              </Button>
            </span>
          </li>
        ))}
      </ol>
      {dirty && (
        <div className="sticky bottom-4 flex justify-end p-4">
          <Button
            disabled={pending}
            className="bg-forest text-white shadow-lg hover:bg-pine dark:bg-primary dark:text-primary-foreground"
            onClick={() =>
              start(async () => {
                const res = await save(list.map((p) => p.id));
                if (res?.error) toast.error(res.error);
                else {
                  toast.success(res?.message ?? "Saved");
                  setDirty(false);
                  router.refresh();
                }
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Save order
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- gallery */

export function GalleryUpload({ add, defaultCategory }: { add: (input: { paths: string[]; category: string }) => Promise<ActionState>; defaultCategory: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(defaultCategory);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const router = useRouter();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, 40);
    setProgress({ done: 0, total: list.length });
    const paths: string[] = [];
    let failed = 0;
    for (const file of list) {
      try {
        const body = new FormData();
        body.append("file", await compressImage(file, 2400, 0.88));
        const res = await fetch("/api/admin/media", { method: "POST", body });
        const data = (await res.json()) as { path?: string; error?: string };
        if (!res.ok || !data.path) throw new Error(data.error);
        paths.push(data.path);
      } catch {
        failed++;
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    if (paths.length) {
      const res = await add({ paths, category });
      if (res?.error) toast.error(res.error);
      else toast.success(res?.message ?? "Uploaded");
    }
    if (failed) toast.error(`${failed} file(s) could not be uploaded (JPG, PNG, WebP or AVIF, max 12 MB).`);
    setProgress(null);
    if (input.current) input.current.value = "";
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="upload-category">
        Category for new photos
      </label>
      <select id="upload-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm">
        {galleryCategoryOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      <Button type="button" onClick={() => input.current?.click()} disabled={!!progress} className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
        {progress ? <Loader2 className="animate-spin" /> : <Upload />}
        {progress ? `Uploading ${progress.done}/${progress.total}…` : "Upload photos"}
      </Button>
    </div>
  );
}

export function GalleryCard({
  item,
  save,
  toggle,
  remove,
}: {
  item: GalleryItem;
  save: Action;
  toggle: (field: "published" | "featured", value: boolean) => Promise<ActionState>;
  remove: Action;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const flip = (field: "published" | "featured") =>
    start(async () => {
      const res = await toggle(field, !item[field]);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });
  const needsText = item.altEn === "Photo at Annemarie-Schimmel-Haus";
  return (
    <figure className={cn("group relative overflow-hidden rounded-xl border bg-card", !item.published && "opacity-75")}>
      <div className="relative aspect-[4/3] bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
        <img src={item.imagePath} alt={item.altEn} loading="lazy" className="size-full object-cover" />
        <div className="absolute top-2 left-2 flex gap-1">
          {!item.published && <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">Hidden</span>}
          {item.featured && <span className="rounded-full bg-brass px-2 py-0.5 text-[10px] font-semibold text-white">Featured</span>}
          {needsText && <span className="rounded-full bg-[#d98a1f] px-2 py-0.5 text-[10px] font-semibold text-white">Needs description</span>}
        </div>
      </div>
      <figcaption className="grid gap-2 p-3">
        <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">{item.captionEn || item.altEn}</p>
        <div className="flex items-center gap-1">
          <span className="mr-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">{GALLERY_CATEGORY_LABELS[item.category]}</span>
          <Button type="button" variant="ghost" size="sm" className="size-8 p-0" disabled={pending} onClick={() => flip("published")} aria-label={item.published ? "Hide photo" : "Publish photo"} title={item.published ? "Hide" : "Publish"}>
            {item.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="size-8 p-0" disabled={pending} onClick={() => flip("featured")} aria-label={item.featured ? "Remove from featured" : "Feature photo"} title="Featured on the homepage">
            <Star className={cn("size-4", item.featured && "fill-brass text-brass")} />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="size-8 p-0" aria-label="Edit photo details">
                <Pencil className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <AdminForm action={save} onSuccess={() => setOpen(false)} className="grid gap-4">
                {(state) => (
                  <>
                    <DialogHeader>
                      <DialogTitle>Photo details</DialogTitle>
                      <DialogDescription>The description is read aloud to blind visitors and used by search engines.</DialogDescription>
                    </DialogHeader>
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
                    <img src={item.imagePath} alt="" className="max-h-56 w-full rounded-lg bg-muted object-contain" />
                    <BilingualField label="Description (alt text)" name="alt" values={{ en: needsText ? "" : item.altEn, de: item.altDe }} state={state} required />
                    <BilingualField label="Caption" name="caption" values={{ en: item.captionEn, de: item.captionDe }} state={state} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField label="Category" name="category" defaultValue={item.category} options={galleryCategoryOptions} state={state} required />
                      <TextField label="Sort order" name="sortOrder" type="number" defaultValue={item.sortOrder} state={state} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SwitchField label="Published" name="published" defaultChecked={item.published || needsText} />
                      <SwitchField label="Featured" name="featured" defaultChecked={item.featured} />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <SubmitButton>Save</SubmitButton>
                    </DialogFooter>
                  </>
                )}
              </AdminForm>
            </DialogContent>
          </Dialog>
          <ConfirmAction action={remove} title="Remove this photo?" description="It disappears from the website gallery. The file stays in the media library." confirmLabel="Remove" destructive variant="ghost">
            <Trash className="size-4" />
          </ConfirmAction>
        </div>
      </figcaption>
    </figure>
  );
}
