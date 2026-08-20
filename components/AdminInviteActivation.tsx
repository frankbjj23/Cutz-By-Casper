"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBookingBrowserClient } from "@/lib/supabase/browser";

type ActivationState = "checking" | "invalid" | "failed";

const messages: Record<ActivationState, string> = {
  checking: "Securely opening your owner invitation…",
  invalid: "Open the newest Supabase invitation email to activate this account.",
  failed: "This invitation is invalid or expired. Request a new owner invitation.",
};

export default function AdminInviteActivation() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [state, setState] = useState<ActivationState>("checking");

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function activateInvite() {
      const supabase = createBookingBrowserClient();
      if (!supabase) {
        setState("failed");
        return;
      }

      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");
      const hash = new URLSearchParams(currentUrl.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const providerError =
        currentUrl.searchParams.get("error") ?? hash.get("error");

      if (providerError) {
        window.history.replaceState(null, "", "/admin/accept-invite");
        setState("failed");
        return;
      }

      let error: Error | null = null;
      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        error = result.error;
      } else {
        const result = await supabase.auth.getUser();
        if (!result.data.user || result.error) {
          setState("invalid");
          return;
        }
      }

      window.history.replaceState(null, "", "/admin/accept-invite");
      if (error) {
        setState("failed");
        return;
      }

      router.refresh();
    }

    void activateInvite();
  }, [router]);

  return (
    <div
      role={state === "checking" ? "status" : "alert"}
      aria-live="polite"
      className="mt-8 border border-gold/30 bg-gold/5 p-5 text-sm leading-7 text-pearl/75"
    >
      {messages[state]}
    </div>
  );
}
