"use client";

import { type FormEvent, useState } from "react";
import { REVIEW_CONSENT_VERSION } from "@/lib/reviews";

type SubmissionState = "idle" | "sending" | "sent" | "error";

export default function ReviewSubmissionForm() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setState("sending");
    setMessage("Sending your review privately…");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          rating: formData.get("rating"),
          reviewText: formData.get("reviewText"),
          company: formData.get("company"),
          consent: formData.get("consent") === "on",
          consentVersion: REVIEW_CONSENT_VERSION,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        throw new Error(
          result?.error?.message ?? "Your review could not be sent. Please try again.",
        );
      }

      form.reset();
      setState("sent");
      setMessage(
        "Thank you. Your review is private until Frank or Casper approves it for the website.",
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Your review could not be sent. Please try again.",
      );
    }
  }

  return (
    <form
      className="space-y-6 border border-gold/30 bg-[#111113] p-6 shadow-soft sm:p-9"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pearl/75">
            Display name
          </span>
          <input
            name="displayName"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={60}
            disabled={state === "sending"}
            className="min-h-12 w-full border border-white/20 bg-black/35 px-4 text-base text-pearl outline-none transition placeholder:text-pearl/55 focus:border-gold disabled:opacity-60"
            placeholder="The name shown publicly"
          />
        </label>
        <label className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pearl/75">
            Private email
          </span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={320}
            disabled={state === "sending"}
            className="min-h-12 w-full border border-white/20 bg-black/35 px-4 text-base text-pearl outline-none transition placeholder:text-pearl/55 focus:border-gold disabled:opacity-60"
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pearl/75">
          Your rating
        </span>
        <select
          name="rating"
          required
          defaultValue=""
          disabled={state === "sending"}
          className="min-h-12 w-full border border-white/20 bg-black px-4 text-base text-pearl outline-none transition focus:border-gold disabled:opacity-60"
        >
          <option value="" disabled>Choose one</option>
          <option value="5">★★★★★ — Excellent</option>
          <option value="4">★★★★☆ — Very good</option>
          <option value="3">★★★☆☆ — Good</option>
          <option value="2">★★☆☆☆ — Fair</option>
          <option value="1">★☆☆☆☆ — Poor</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pearl/75">
          Your experience
        </span>
        <textarea
          name="reviewText"
          required
          minLength={20}
          maxLength={1000}
          rows={7}
          disabled={state === "sending"}
          className="w-full resize-y border border-white/20 bg-black/35 px-4 py-3 text-base leading-7 text-pearl outline-none transition placeholder:text-pearl/55 focus:border-gold disabled:opacity-60"
          placeholder="Tell future clients what stood out about your experience with Casper."
        />
      </label>

      <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-start gap-3 border border-white/10 bg-black/20 p-4">
        <input
          name="consent"
          type="checkbox"
          required
          disabled={state === "sending"}
          className="mt-1 size-4 shrink-0 accent-[#c7a55d]"
        />
        <span className="text-xs leading-6 text-pearl/60">
          I agree that Redeemed Precision Grooming may privately store this review and
          my email for moderation. If approved, only my display name, rating, and review
          will appear publicly. My email will not be displayed. See the{" "}
          <a
            href="/privacy#website-reviews"
            className="font-semibold text-pearl underline decoration-gold underline-offset-4"
          >
            review privacy details
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={state === "sending"}
        className="primary-button w-full disabled:cursor-wait disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Send Review for Approval"}
      </button>

      {message ? (
        <p
          role={state === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`border px-4 py-3 text-sm leading-6 ${
            state === "error"
              ? "border-red-300/40 bg-red-950/30 text-red-100"
              : "border-gold/30 bg-gold/5 text-pearl/75"
          }`}
        >
          {message}
        </p>
      ) : null}

      <p className="text-xs leading-6 text-pearl/55">
        This creates a Redeemed website review. It does not post to Booksy and is not
        labeled as a confirmed Booksy review.
      </p>
    </form>
  );
}
