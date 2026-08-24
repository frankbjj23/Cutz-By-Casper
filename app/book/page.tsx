import type { Metadata } from "next";
import Link from "next/link";
import {
  BOOKSY_PRIVACY_URL,
  BOOKSY_URL,
  BRAND_OG_PATH,
  business,
  locationDisplay,
  SITE_URL,
} from "@/lib/site";

const description =
  "View Casper's current services, prices, policies, and live appointment times on Booksy.";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description,
  alternates: {
    canonical: "/book",
  },
  openGraph: {
    title: `Book an Appointment | ${business.name}`,
    description,
    url: SITE_URL + "/book",
    siteName: business.name,
    images: [BRAND_OG_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: `Book an Appointment | ${business.name}`,
    description,
    images: [BRAND_OG_PATH],
  },
};

export default function BookPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-6xl flex-col gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <section className="mx-auto max-w-3xl space-y-7 text-center">
        <p className="eyebrow">Official booking calendar</p>
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-pearl sm:text-7xl">
          Reserve
          <span className="block italic text-gold">your time.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-8 text-pearl/60">
          Redeemed Precision Grooming appointments are completed through Casper&apos;s
          existing Booksy profile, where the live calendar, current menu, pricing,
          and booking terms stay together.
        </p>
        <p className="mx-auto max-w-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm leading-7 text-pearl/70">
          Current Booksy location: {locationDisplay}. Confirm the appointment time and
          location on Booksy before traveling.
        </p>
        <a
          href={BOOKSY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Continue to Casper's Booksy profile (opens in a new tab)"
          className="primary-button mt-1"
        >
          View Live Appointments
        </a>
      </section>

      <section className="light-panel p-7 sm:p-12" aria-labelledby="what-happens-heading">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.32em] text-ink/65">
          The process
        </p>
        <h2 id="what-happens-heading" className="mt-4 font-display text-4xl text-ink">
          Three considered steps.
        </h2>
        <ol className="mt-10 grid border-t border-ink/20 sm:grid-cols-3">
          <li className="space-y-4 border-b border-ink/20 py-6 sm:border-b-0 sm:border-r sm:pr-6">
            <p className="text-xs font-bold tracking-[0.25em] text-ink/65">01</p>
            <p className="font-display text-xl text-ink">Choose a service</p>
            <p className="text-sm leading-6 text-ink/60">Review the current menu and timing.</p>
          </li>
          <li className="space-y-4 border-b border-ink/20 py-6 sm:border-b-0 sm:border-r sm:px-6">
            <p className="text-xs font-bold tracking-[0.25em] text-ink/65">02</p>
            <p className="font-display text-xl text-ink">Select an open time</p>
            <p className="text-sm leading-6 text-ink/60">Choose directly from Casper&apos;s live calendar.</p>
          </li>
          <li className="space-y-4 py-6 sm:pl-6">
            <p className="text-xs font-bold tracking-[0.25em] text-ink/65">03</p>
            <p className="font-display text-xl text-ink">Review and confirm</p>
            <p className="text-sm leading-6 text-ink/60">Check the details and current terms.</p>
          </li>
        </ol>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="lux-card p-7 sm:p-8">
          <p className="eyebrow">Live calendar</p>
          <h2 className="mt-5 font-display text-2xl text-pearl">One source of truth</h2>
          <p className="mt-4 text-sm leading-7 text-pearl/60">
            The website does not maintain a second calendar. Booksy is the live source for
            appointment availability and booking details.
          </p>
        </div>
        <div className="lux-card p-7 sm:p-8">
          <p className="eyebrow">Your information</p>
          <h2 className="mt-5 font-display text-2xl text-pearl">Handled by Booksy</h2>
          <p className="mt-4 text-sm leading-7 text-pearl/60">
            Booking is completed on Booksy, which processes the information you provide.
            Review the{" "}
            <a
              href={BOOKSY_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pearl underline decoration-gold underline-offset-8"
            >
              Booksy privacy notice
            </a>
            .
          </p>
        </div>
      </section>

      <div className="text-center">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/65 underline decoration-gold underline-offset-8 transition hover:text-pearl">
          Return home
        </Link>
      </div>
    </main>
  );
}
