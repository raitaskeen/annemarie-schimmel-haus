import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";

export default function NoAccess() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
      <div className="max-w-md">
        <ShieldAlert className="mx-auto size-12 text-ash" />
        <h1 className="mt-4 font-display text-3xl text-forest">You don&rsquo;t have access to this area</h1>
        <p className="mt-2 text-sm text-stone">Your account doesn&rsquo;t include permission for this page. Ask an administrator if you think this is a mistake.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/admin" className="inline-flex h-10 items-center rounded-full bg-forest px-5 text-sm font-semibold text-white">Dashboard</Link>
          <form action={logoutAction}>
            <button className="inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-forest ring-1 ring-ink/15">Sign out</button>
          </form>
        </div>
      </div>
    </main>
  );
}
