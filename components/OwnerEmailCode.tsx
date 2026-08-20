"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBookingBrowserClient } from "@/lib/supabase/browser";

type Step = "request" | "verify";

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function OwnerEmailCode() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("request");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = cleanEmail(email);
    if (!normalizedEmail || normalizedEmail.length > 320) {
      setMessage("Enter the approved owner email address.");
      return;
    }

    const supabase = createBookingBrowserClient();
    if (!supabase) {
      setMessage("The private booking room is not connected yet.");
      return;
    }

    setPending(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });
    setPending(false);

    if (error) {
      setMessage(
        error.message.toLowerCase().includes("rate limit")
          ? "Too many emails were requested. Wait a little while, then request one new code."
          : "A code could not be sent. Confirm the approved email and try again.",
      );
      return;
    }

    setEmail(normalizedEmail);
    setStep("verify");
    setMessage("A six-digit owner code was sent. Type the newest code below.");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = cleanEmail(email);
    const normalizedCode = code.replace(/\D/g, "");
    if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
      setMessage("Enter the six-digit code from the newest email.");
      return;
    }

    const supabase = createBookingBrowserClient();
    if (!supabase) {
      setMessage("The private booking room is not connected yet.");
      return;
    }

    setPending(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: "email",
    });
    setPending(false);

    if (error) {
      setMessage("That code is invalid or expired. Request one new code and use only the newest email.");
      return;
    }

    router.replace("/admin/accept-invite");
    router.refresh();
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
              Six-digit code
            </label>
            <input
              id="owner-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
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
              setMessage(null);
              setStep("request");
            }}
            className="w-full text-xs font-semibold uppercase tracking-[0.18em] text-pearl/65 underline decoration-gold underline-offset-8"
          >
            Request a different code
          </button>
        </form>
      )}

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="border border-gold/30 bg-gold/5 p-4 text-sm leading-7 text-pearl/80"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
