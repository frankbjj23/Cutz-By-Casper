"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function AdminActivityRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}
    className="border border-gold/40 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/10 disabled:opacity-50">
    {pending ? "Refreshing…" : "Refresh activity"}
  </button>;
}
