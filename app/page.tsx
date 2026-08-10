import Image from "next/image";
import Link from "next/link";
import Gallery from "@/components/Gallery";
import { casperProfile, haircutStyles } from "@/lib/gallery";
import {
  addressDisplay,
  BOOKSY_URL,
  mapsUrl,
  serviceCategories,
} from "@/lib/site";

const bookingSteps = [
  {
    number: "01",
    title: "Choose a service",
    description: "Open Casper's Booksy profile to see the current service menu and pricing.",
  },
  {
    number: "02",
    title: "Pick a live time",
    description: "Select an available appointment directly from Casper's live calendar.",
  },
  {
    number: "03",
    title: "Confirm on Booksy",
    description: "Review the booking details and current policies before confirming.",
  },
] as const;

export default function HomePage() {
  return (
    <main id="main-content" className="mx-auto flex max-w-6xl flex-col gap-16 px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
      <section className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div className="space-y-6">
          <p className="eyebrow">Lyndhurst, New Jersey</p>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl md:text-6xl">
            Precision cuts. Easy online booking.
          </h1>
          <p className="max-w-xl text-base leading-7 text-ink/70 sm:text-lg">
            Explore Casper&apos;s barbering work, then choose a service and a live appointment
            time through Booksy.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={BOOKSY_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View live appointments on Booksy (opens in a new tab)"
              className="primary-button"
            >
              View Live Times
            </a>
            <Link href="/styles" className="secondary-button">
              Browse Styles
            </Link>
          </div>
          <p className="text-xs leading-5 text-ink/65">
            Live availability, prices, and booking terms are shown on Booksy.
          </p>
        </div>

        <div className="lux-card overflow-hidden">
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={casperProfile.src}
              alt={casperProfile.alt}
              fill
              preload
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="services-heading" className="space-y-6">
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">Services</p>
          <h2 id="services-heading" className="section-title">
            Barbering built around the details.
          </h2>
          <p className="text-sm leading-6 text-ink/70">
            These are service categories, not a fixed menu. Visit Booksy for the current
            options, timing, and prices.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {serviceCategories.map((service) => (
            <article key={service.name} className="lux-card p-6">
              <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/65">{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lux-card p-7 sm:p-9" aria-labelledby="booking-heading">
        <div className="flex flex-col gap-8">
          <div className="max-w-2xl space-y-3">
            <p className="eyebrow">Booking</p>
            <h2 id="booking-heading" className="section-title">
              One calendar. Three simple steps.
            </h2>
            <p className="text-sm leading-6 text-ink/70">
              Booksy is Casper&apos;s booking system and the source of truth for open times.
            </p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {bookingSteps.map((step) => (
              <li key={step.number} className="border-l border-gold pl-5">
                <p className="text-xs font-semibold tracking-[0.25em] text-ink/65">
                  {step.number}
                </p>
                <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/65">{step.description}</p>
              </li>
            ))}
          </ol>
          <div>
            <a
              href={BOOKSY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
            >
              Book on Booksy
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="space-y-5">
          <p className="eyebrow">Meet Casper</p>
          <h2 className="section-title">A focused approach to every cut.</h2>
          <p className="text-sm leading-7 text-ink/70">
            Casper provides precision haircuts, beard work, and shape-ups in Lyndhurst.
            Browse the gallery to see examples of his fades, tapers, textured styles, and
            detailed finishing work.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/styles" className="secondary-button">
              View the Gallery
            </Link>
            <a
              href={BOOKSY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
            >
              Book Now
            </a>
          </div>
        </div>
        <div className="lux-card p-7 sm:p-9">
          <p className="eyebrow">Client feedback</p>
          <h2 className="mt-3 font-display text-3xl tracking-wide">
            Read current reviews on Booksy.
          </h2>
          <p className="mt-4 text-sm leading-6 text-ink/70">
            Review totals change over time, so Casper&apos;s Booksy profile is the best place
            to see current client feedback.
          </p>
          <a
            href={BOOKSY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-ink underline decoration-gold decoration-2 underline-offset-4"
          >
            Read Reviews on Booksy
          </a>
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="gallery-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Style gallery</p>
            <h2 id="gallery-heading" className="section-title mt-2">
              Selected work.
            </h2>
          </div>
          <Link href="/styles" className="secondary-button">
            View All Styles
          </Link>
        </div>
        <Gallery items={haircutStyles.slice(0, 12)} showFilter={false} />
      </section>

      <section className="lux-card grid gap-8 p-7 sm:p-9 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="space-y-4">
          <p className="eyebrow">Visit</p>
          <h2 className="section-title">Lyndhurst, New Jersey.</h2>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-ink/70 underline decoration-gold decoration-2 underline-offset-4"
          >
            {addressDisplay}
          </a>
        </div>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-ink/70">
            Hours and open appointment times can change. Check Casper&apos;s live Booksy
            calendar before making the trip.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={BOOKSY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
            >
              Check Availability
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button"
            >
              Open Map
            </a>
          </div>
        </div>
      </section>

      <section id="policies" className="border-y border-fog py-9">
        <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Before you confirm</p>
            <h2 className="section-title mt-2">Current booking terms.</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-ink/70">
            <p>
              Casper&apos;s current cancellation, payment, and service-specific terms are
              displayed during the Booksy booking process. Review them there before
              confirming your appointment.
            </p>
            <Link href="/book" className="font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4">
              Read booking details
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
