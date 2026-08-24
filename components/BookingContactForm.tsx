"use client";

import Script from "next/script";
import { type FormEvent, useState } from "react";
import {
  BOOKING_CONTACT_CONSENT_VERSION,
} from "@/lib/booking-contact";
import { BOOKSY_URL, BOOKSY_WIDGET_URL } from "@/lib/site";

type SubmissionState = "idle" | "saving" | "saved" | "error";

const BOOKSY_OPENING_POSITION_WINDOW_MS = 1800;

function moveViewportToTopImmediately() {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  root.style.scrollBehavior = previousScrollBehavior;
}

function launchBooksyWidgetAtTop(button: HTMLElement) {
  // Booksy inserts and resizes a document-height dialog after the click. Watch
  // that short setup window so its focus/resize work cannot leave the page at
  // the bottom, then release the page so the customer can scroll every service.
  const observer = new MutationObserver(moveViewportToTopImmediately);
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ["style"],
  });

  button.click();
  moveViewportToTopImmediately();
  window.setTimeout(() => {
    observer.disconnect();
    moveViewportToTopImmediately();
  }, BOOKSY_OPENING_POSITION_WINDOW_MS);
}

export default function BookingContactForm() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetFailed, setWidgetFailed] = useState(false);

  function openBooksyWidget() {
    const button = document.querySelector<HTMLElement>(".booksy-widget-button");
    if (!button) {
      setWidgetFailed(true);
      setMessage(
        "Your details are saved, but the embedded calendar could not open. Use the Booksy link below.",
      );
      return;
    }
    launchBooksyWidgetAtTop(button);
  }

  function handleWidgetReady() {
    const button = document.querySelector<HTMLElement>(".booksy-widget-button");
    const container = button?.closest<HTMLElement>(".booksy-widget-container");
    if (!button) {
      setWidgetFailed(true);
      setMessage(
        "Your details are saved, but the embedded calendar could not open. Use the Booksy link below.",
      );
      return;
    }

    if (container) container.style.display = "none";
    setWidgetReady(true);
    setMessage("Saved. Opening Casper’s live Booksy calendar on this page…");
    window.setTimeout(() => launchBooksyWidgetAtTop(button), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setState("saving");
    setMessage("Saving your contact details securely…");

    try {
      const response = await fetch("/api/booking-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          company: formData.get("company"),
          consent: formData.get("consent") === "on",
          consentVersion: BOOKING_CONTACT_CONSENT_VERSION,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        throw new Error(
          result?.error?.message ??
            "Your details could not be saved. You can still continue to Booksy.",
        );
      }

      setState("saved");
      setMessage("Saved. Loading Casper’s live Booksy calendar…");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Your details could not be saved. You can still continue to Booksy.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl border border-gold/30 bg-[#111113] p-6 text-left shadow-soft sm:p-9">
      <div className="border-b border-white/10 pb-6">
        <p className="eyebrow">Private contact handoff</p>
        <h2 className="mt-4 font-display text-3xl text-pearl sm:text-4xl">
          Let Casper know you&apos;re coming.
        </h2>
        <p className="mt-4 text-sm leading-7 text-pearl/60">
          Save your name and at least one contact method here. You&apos;ll continue to
          Booksy next to choose and confirm the actual appointment.
        </p>
      </div>

      <form className="mt-7 space-y-6" onSubmit={handleSubmit} noValidate={false}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pearl/75">
              Full name
            </span>
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              disabled={state === "saving" || state === "saved"}
              className="min-h-12 w-full border border-white/20 bg-black/35 px-4 text-base text-pearl outline-none transition placeholder:text-pearl/30 focus:border-gold disabled:opacity-60"
              placeholder="Your name"
            />
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pearl/75">
              Mobile number <span className="normal-case tracking-normal text-pearl/45">(optional)</span>
            </span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              disabled={state === "saving" || state === "saved"}
              className="min-h-12 w-full border border-white/20 bg-black/35 px-4 text-base text-pearl outline-none transition placeholder:text-pearl/30 focus:border-gold disabled:opacity-60"
              placeholder="(201) 555-0123"
            />
          </label>
          <label className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pearl/75">
              Email <span className="normal-case tracking-normal text-pearl/45">(optional)</span>
            </span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={320}
              disabled={state === "saving" || state === "saved"}
              className="min-h-12 w-full border border-white/20 bg-black/35 px-4 text-base text-pearl outline-none transition placeholder:text-pearl/30 focus:border-gold disabled:opacity-60"
              placeholder="you@example.com"
            />
          </label>
        </div>

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
            disabled={state === "saving" || state === "saved"}
            className="mt-1 size-4 shrink-0 accent-[#c7a55d]"
          />
          <span className="text-xs leading-6 text-pearl/60">
            I agree that {"Redeemed Precision Grooming"} may store these details until
            approved staff deletes them or I request deletion, so Casper can follow up
            about this booking handoff. This does not confirm an appointment or subscribe
            me to marketing. See the{" "}
            <a href="/privacy#booking-contact" className="font-semibold text-pearl underline decoration-gold underline-offset-4">
              privacy details
            </a>
            .
          </span>
        </label>

        <p className="text-xs leading-6 text-pearl/45">
          Enter a mobile number, an email address, or both. Booksy will separately ask
          for the information it needs to complete your appointment.
        </p>

        {state === "saved" ? (
          <button
            type="button"
            onClick={openBooksyWidget}
            disabled={!widgetReady}
            className="primary-button w-full disabled:cursor-wait disabled:opacity-60"
          >
            {widgetReady ? "Open Live Booking Calendar" : "Loading Live Calendar…"}
          </button>
        ) : (
          <button
            type="submit"
            disabled={state === "saving"}
            className="primary-button w-full disabled:cursor-wait disabled:opacity-60"
          >
            {state === "saving" ? "Saving…" : "Save & Continue to Booksy"}
          </button>
        )}

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

        <div className="text-center">
          <a
            href={BOOKSY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-pearl/60 underline decoration-gold underline-offset-6 transition hover:text-pearl"
          >
            {state === "saved" || widgetFailed
              ? "Open Booksy in a new tab"
              : "Continue directly to Booksy without saving"}
          </a>
        </div>

        {state === "saved" ? (
          <Script
            id="redeemed-booksy-widget"
            src={BOOKSY_WIDGET_URL}
            strategy="afterInteractive"
            onLoad={handleWidgetReady}
            onError={() => {
              setWidgetFailed(true);
              setMessage(
                "Your details are saved, but the embedded calendar could not load. Use the Booksy link below.",
              );
            }}
          />
        ) : null}
      </form>
    </div>
  );
}
