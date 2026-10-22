import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <SearchX className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl">Not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This record does not exist (any more). It may have been deleted, or the link is incomplete.</p>
        <Button asChild className="mt-6 bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
          <Link href="/admin">Back to the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
