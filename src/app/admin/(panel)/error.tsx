"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Admin error boundary: the sidebar stays usable; nothing was changed by the failed render. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[50vh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl">This page could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">Nothing was changed. Try again — if it keeps happening, send the reference below to your administrator (it is in the server log).</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset} className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
            <RotateCcw /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">Dashboard</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="mt-5 text-xs text-muted-foreground">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
