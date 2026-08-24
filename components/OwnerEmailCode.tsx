"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  isValidOwnerCode,
  normalizeOwnerCode,
  OWNER_CODE_MAX_LENGTH,
  OWNER_CODE_MIN_LENGTH,
} from "@/lib/owner-access";
import { createBookingBrowserClient } from "@/lib/supabase/browser";

type Step = "request" | "verify";
type Notice = {
  kind: "error" | "success";
  text: string;
};

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function OwnerEmailCode() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("request");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = cleanEmail(email);
    if (!normalizedEmail || normalizedEmail.length > 320) {
      setNotice({ kind: "error", text: "Enter the approved owner email address." });
      return;
    }

    const supabase = createBookingBrowserClient();
    if (!supabase) {
      setNotice({ kind: "error", text: "The private booking room is not connected yet." });
      return;
    }

    setPending(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });

      if (error) {
        setNotice({
          kind: "error",
          text: error.message.toLowerCase().includes("rate limit")
            ? "Too many emails were requested. Wait a little while, then request one new code."
            : "A code could not be sent. Confirm the approved email and try again.",
        });
        return;
      }

      setEmail(normalizedEmail);
      setCode("");
      setStep("verify");
      setNotice({
        kind: "success",
        text: "An owner code was sent. Type the newest code below.",
      });
    } catch {
      setNotice({
        kind: "error",
        text: "The code email could not be requested right now. Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = cleanEmail(email);
    const normalizedCode = normalizeOwnerCode(code);
    if (!normalizedEmail || !isValidOwnerCode(normalizedCode)) {
      setNotice({
        kind: "error",
        text: "Enter the complete 6–10 digit code from the newest email.",
      });
      return;
    }

    const supabase = createBookingBrowserClient();
    if (!supabase) {
      setNotice({ kind: "error", text: "The private booking room is not connected yet." });
      return;
    }

    setPending(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: "email",
      });

      if (error) {
        setNotice({
          kind: "error",
          text: "That code is invalid or expired. Request one new code and use only the newest email.",
        });
        return;
      }

      router.replace("/admin/accept-invite");
      router.refresh();
    } catch {
      setNotice({
        kind: "error",
        text: "The code could not be checked right now. Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {step === "request" ? (
        <form onSubmit={requestCode} className="space-y-6">
          <div>
            <label
              htmlFor="owner-email"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/75"
            >
              Approved owner email
            </label>
            <input
              id="owner-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={notice ? "owner-access-notice" : undefined}
              aria-invalid={notice?.kind === "error"}
              required
              className="mt-3 w-full border border-pearl/20 bg-black px-4 py-3 text-base text-pearl outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <button type="submit" disabled={pending} className="primary-button w-full disabled:cursor-wait disabled:opacity-60">
            {pending ? "Sending secure code…" : "Email my owner code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/75">
              Code sent to
            </p>
            <p className="mt-2 break-all text-sm text-pearl">{email}</p>
          </div>
          <div>
            <label
              htmlFor="owner-code"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/75"
            >
              Owner code
            </label>
            <input
              id="owner-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              minLength={OWNER_CODE_MIN_LENGTH}
              maxLength={OWNER_CODE_MAX_LENGTH}
              value={code}
              onChange={(event) => setCode(normalizeOwnerCode(event.target.value))}
              aria-describedby={notice ? "owner-access-notice" : undefined}
              aria-invalid={notice?.kind === "error"}
              required
              className="mt-3 w-full border border-pearl/20 bg-black px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-pearl outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <button type="submit" disabled={pending} className="primary-button w-full disabled:cursor-wait disabled:opacity-60">
            {pending ? "Checking secure code…" : "Verify owner code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCode("");
              setNotice(null);
              setStep("request");
            }}
            className="w-full text-xs font-semibold uppercase tracking-[0.18em] text-pearl/65 underline decoration-gold underline-offset-8"
          >
            Request a different code
          </button>
        </form>
      )}

      {notice ? (
        <p
          id="owner-access-notice"
          role={notice.kind === "error" ? "alert" : "status"}
          aria-live={notice.kind === "error" ? "assertive" : "polite"}
          className={`border p-4 text-sm leading-7 ${
            notice.kind === "error"
              ? "border-red-300/40 bg-red-950/30 text-red-100"
              : "border-gold/30 bg-gold/5 text-pearl/80"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
