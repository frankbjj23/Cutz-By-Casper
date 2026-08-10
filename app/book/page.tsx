import type { Metadata } from "next";
import Link from "next/link";
import {
  BOOKSY_PRIVACY_URL,
  BOOKSY_URL,
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
    title: "Book an Appointment | Cutz By Casper",
    description,
    url: SITE_URL + "/book",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book an Appointment | Cutz By Casper",
    description,
    images: ["/og.png"],
  },
};

export default function BookPage() {
  return (
    <main id="main-content" className="mx-auto flex max-w-4xl flex-col gap-10 px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
      <section className="space-y-6 text-center">
        <p className="eyebrow">Official booking calendar</p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Book with Casper on Booksy.
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-ink/70">
          Booksy shows Casper&apos;s live availability, current service menu, prices, and
          booking terms in one place.
        </p>
        <a
          href={BOOKSY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Continue to Casper's Booksy profile (opens in a new tab)"
          className="primary-button"
        >
          Continue to Booksy
        </a>
      </section>

      <section className="lux-card p-7 sm:p-9" aria-labelledby="what-happens-heading">
        <h2 id="what-happens-heading" className="section-title">
          What happens next
        </h2>
        <ol className="mt-7 grid gap-6 sm:grid-cols-3">
          <li className="space-y-2 border-l border-gold pl-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-ink/65">01</p>
            <p className="font-semibold">Choose a service</p>
          </li>
          <li className="space-y-2 border-l border-gold pl-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-ink/65">02</p>
            <p className="font-semibold">Select an open time</p>
          </li>
          <li className="space-y-2 border-l border-gold pl-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-ink/65">03</p>
            <p className="font-semibold">Review and confirm</p>
          </li>
        </ol>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="lux-card p-6">
          <h2 className="text-lg font-semibold">One source of truth</h2>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            The website does not maintain a second calendar. Booksy is the live source for
            appointment availability and booking details.
          </p>
        </div>
        <div className="lux-card p-6">
          <h2 className="text-lg font-semibold">Your booking information</h2>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            Booking is completed on Booksy, which processes the information you provide.
            Review the{" "}
            <a
              href={BOOKSY_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4"
            >
              Booksy privacy notice
            </a>
            .
          </p>
        </div>
      </section>

      <div className="text-center">
        <Link href="/" className="text-sm font-semibold underline decoration-gold decoration-2 underline-offset-4">
          Return home
        </Link>
      </div>
    </main>
  );
}
