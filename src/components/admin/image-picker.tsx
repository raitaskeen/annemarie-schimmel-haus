"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, Search, Trash, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/client/compress-image";
import { cn } from "@/lib/utils";

export type PickerImage = { path: string; label: string };

/** Choose an existing photo from the library or upload a new one (optimised in the browser, re-encoded on the server). */
export function ImagePicker({ name, defaultValue, images, label = "Image" }: { name: string; defaultValue?: string | null; images: PickerImage[]; label?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const filtered = images.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", await compressImage(file, 2400, 0.88));
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !data.path) throw new Error(data.error ?? "Upload failed");
      setValue(data.path);
      setOpen(false);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3 rounded-xl border p-2">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
          {value ? <img src={value} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs text-muted-foreground">{value || "No image selected"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  Choose
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] max-w-3xl overflow-hidden sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Choose an image</DialogTitle>
                </DialogHeader>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search captions…" className="pl-9" />
                  </div>
                  <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => void upload(e.target.files?.[0])} />
                  <Button type="button" onClick={() => input.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload
                  </Button>
                </div>
                <ul className="grid max-h-[55dvh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                  {filtered.map((img) => (
                    <li key={img.path}>
                      <button
                        type="button"
                        onClick={() => {
                          setValue(img.path);
                          setOpen(false);
                        }}
                        className={cn("group relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted ring-offset-2", value === img.path && "ring-2 ring-primary")}
                        title={img.label}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail grid */}
                        <img src={img.path} alt={img.label} loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
                        {value === img.path && (
                          <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3.5" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </DialogContent>
            </Dialog>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setValue("")}>
                <Trash /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
