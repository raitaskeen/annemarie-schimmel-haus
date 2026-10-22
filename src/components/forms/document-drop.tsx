"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Camera, FileText, Loader2, RefreshCw, Trash, Upload } from "lucide-react";
import { compressImage, formatBytes } from "@/lib/client/compress-image";
import { cn } from "@/lib/utils";

const MAX = 5 * 1024 * 1024;

/**
 * Checks the file's first bytes against its claimed type, so a renamed or corrupt file is
 * refused right away instead of at submission (the server checks again either way).
 */
async function looksLike(f: File) {
  const b = new Uint8Array(await f.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (f.type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (f.type === "image/png") return b[0] === 0x89 && ascii(1, 4) === "PNG";
  if (f.type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (f.type === "application/pdf") return ascii(0, 5) === "%PDF-";
  return false;
}

/** Drag-and-drop / camera-friendly document picker with preview and client-side optimisation. */
export function DocumentDrop({
  label,
  hint,
  required,
  accept,
  file,
  onFile,
  error,
  labels,
}: {
  label: string;
  hint: string;
  required: boolean;
  accept: readonly string[];
  file: File | null;
  onFile: (file: File | null, error?: string) => void;
  error?: string;
  labels: { drop: string; browse: string; replace: string; remove: string; compressing: string; tooLarge: string; type: string; optional: string };
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  // One object URL per selected image, released when the file changes or the field unmounts.
  const preview = useMemo(() => (file?.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!accept.includes(f.type) || !(await looksLike(f))) return onFile(null, labels.type);
    setBusy(true);
    const optimised = await compressImage(f);
    setBusy(false);
    if (optimised.size > MAX) return onFile(null, labels.tooLarge);
    onFile(optimised);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-forest">
          {label}
          {required && <span className="ml-0.5 text-ash">*</span>}
        </label>
        {!required && <span className="text-xs text-stone">{labels.optional}</span>}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex min-h-36 items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition-colors",
          dragging ? "border-ash bg-mist" : file ? "border-ash/40 bg-white/80" : "border-input bg-white/50 hover:border-ash/50",
          error && "border-destructive/60 bg-[#fdecea]/40",
        )}
      >
        <input
          ref={input}
          id={id}
          type="file"
          accept={accept.join(",")}
          capture={undefined}
          className="sr-only"
          aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {busy ? (
          <div className="flex w-full items-center justify-center gap-2 text-sm text-stone">
            <Loader2 className="size-4 animate-spin" /> {labels.compressing}
          </div>
        ) : file ? (
          <>
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-mint">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <FileText className="size-8 text-pine" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-forest">{file.name}</p>
              <p className="text-xs text-stone">{formatBytes(file.size)}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-mist px-3 text-xs font-semibold text-pine hover:bg-mint">
                  <RefreshCw className="size-3.5" /> {labels.replace}
                </button>
                <button type="button" onClick={() => onFile(null)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-destructive hover:bg-[#fdecea]">
                  <Trash className="size-3.5" /> {labels.remove}
                </button>
              </div>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 py-4 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-mint text-pine">
              <Upload className="size-5 sm:hidden" />
              <Camera className="hidden size-5 sm:block" />
            </span>
            <span className="text-sm text-stone">
              {labels.drop} <span className="font-semibold text-pine underline underline-offset-4">{labels.browse}</span>
            </span>
          </button>
        )}
      </div>
      <p id={`${id}-hint`} className="text-xs text-stone">
        {hint}
      </p>
      {error && (
        <p id={`${id}-err`} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
