"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ACTIVITY_SESSION_KEY, activitySession, isActivityPath } from "@/lib/site-activity";

export default function SiteActivityTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || !isActivityPath(pathname) || navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;

    const record = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        // A tab-local, short-lived random ID; never linked to a contact or account.
        const visit = activitySession(sessionStorage.getItem(ACTIVITY_SESSION_KEY), Date.now(), () => crypto.randomUUID());
        sessionStorage.setItem(ACTIVITY_SESSION_KEY, JSON.stringify(visit));
        if (visit.paths.includes(pathname)) return;
        const result = await fetch("/api/site-activity", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: visit.id, path: pathname }),
          keepalive: true, credentials: "same-origin",
        });
        if (!result.ok) return;
        const latest = activitySession(sessionStorage.getItem(ACTIVITY_SESSION_KEY), Date.now(), () => crypto.randomUUID());
        if (latest.id === visit.id && latest.day === visit.day) {
          latest.paths = [...new Set([...latest.paths, pathname])];
          sessionStorage.setItem(ACTIVITY_SESSION_KEY, JSON.stringify(latest));
        }
      } catch { /* Analytics must never block booking, including when storage is unavailable. */ }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void record(); };
    const timer = window.setTimeout(() => void record(), 800);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, pathname]);
  return null;
}
