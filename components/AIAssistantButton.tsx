"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AIAssistantModal from "./AIAssistantModal";

export default function AIAssistantButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("open-ai-assistant", openHandler as EventListener);
    return () => window.removeEventListener("open-ai-assistant", openHandler as EventListener);
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-ink px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-pearl shadow-soft transition hover:-translate-y-0.5 hover:bg-ink/90"
      >
        AI Secretary
      </button>
      <AIAssistantModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
