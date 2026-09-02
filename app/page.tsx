import Image from "next/image";
import Link from "next/link";
import Gallery from "@/components/Gallery";
import ReviewSection from "@/components/ReviewSection";
import { casperProfile, haircutStyles } from "@/lib/gallery";
import {
  BRAND_LOGO_PATH,
  BRAND_MARK_PATH,
  business,
  locationDisplay,
  serviceCategories,
} from "@/lib/site";

const bookingSteps = [
  {
    number: "01",
    title: "Select your service",
    description: "See Casper's current menu, timing, and pricing on Booksy.",
  },
  {
    number: "02",
    title: "Choose a live time",
    description: "Reserve directly from Casper's live Booksy calendar.",
  },
  {
    number: "03",
    title: "Review and confirm",
    description: "Check the current booking terms before completing your appointment.",
  },
] as const;

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="overflow-hidden">
      <section className="border-b border-white/10">
        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl lg:grid-cols-[1fr_0.9fr]">
          <div className="flex items-center px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
            <div className="max-w-2xl space-y-7">
              <Image
                src={BRAND_MARK_PATH}
                alt=""
                width={512}
                height={512}
                sizes="(max-width: 639px) 112px, 128px"
                className="h-auto w-28 border border-gold/35 bg-black p-2 sm:w-32"
              />
              <div className="flex items-center gap-4">
                <span className="editorial-rule" aria-hidden="true" />
                <p className="eyebrow">Redeemed Precision Grooming · Ridgefield</p>
              </div>
              <h1 className="font-display text-5xl leading-[0.92] tracking-[-0.025em] text-pearl sm:text-7xl lg:text-[6.5rem]">
                Precision
                <span className="block italic text-gold">with purpose.</span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-pearl/65 sm:text-lg">
                Thirty years in the industry, grounded in faith, professionalism,
                genuine relationships, and a commitment to helping people feel better
                about themselves.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/book"
                  aria-label="Start booking an appointment"
                  className="primary-button"
                >
                  Reserve an Appointment
                </Link>
                <Link href="/styles" className="secondary-button">
                  Explore the Portfolio
                </Link>
              </div>
              <p className="text-xs leading-5 tracking-wide text-pearl/60">
                Current pricing, policies, and live availability are shown on Booksy.
              </p>
            </div>
          </div>

          <div className="relative min-h-[36rem] border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0">
            <Image
              src={casperProfile.src}
              alt={casperProfile.alt}
              fill
              preload
              sizes="(max-width: 1023px) 100vw, 46vw"
              className="object-cover object-center"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-0 left-0 border-r border-t border-gold/40 bg-ink/85 px-6 py-5 backdrop-blur-sm sm:px-8">
              <p className="font-display text-xl uppercase tracking-[0.16em] text-pearl">
                Casper
              </p>
              <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-gold">
                Barber · Ridgefield, NJ
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:py-32">
        <div className="space-y-5">
          <p className="eyebrow">The craft</p>
          <h2 className="section-title">The standard is in the details.</h2>
          <p className="max-w-md text-sm leading-7 text-pearl/60">
            These service categories cover proportion, texture, grooming, and a clean
            finish. Booksy carries the exact current menu and live pricing.
          </p>
        </div>
        <div className="grid border-t border-white/15 md:grid-cols-3">
          {serviceCategories.map((service, index) => (
            <article
              key={service.name}
              className="border-b border-white/15 py-7 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0"
            >
              <p className="text-[0.68rem] font-bold tracking-[0.3em] text-gold">
                0{index + 1}
              </p>
              <h3 className="mt-8 font-display text-2xl text-pearl">{service.name}</h3>
              <p className="mt-4 text-sm leading-7 text-pearl/55">{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-gold/20 bg-black/25">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
          <div className="max-w-2xl space-y-6">
            <p className="eyebrow">Private consultation preview</p>
            <h2 className="section-title">
              See a haircut or beard direction before the appointment.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-pearl/60">
              Invitation-only AI preview for adults using their own photo. Explore one
              haircut, beard, or color direction at a time, then bring the concept to
              Casper for an in-person consultation.
            </p>
            <p className="border-l border-gold pl-4 text-xs leading-6 text-pearl/55">
              A visual concept is not a guaranteed cut, color result, or available service.
              Current services and appointments remain on Booksy.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/preview" className="primary-button">
                Enter the Private Preview
              </Link>
              <Link href="/book" className="secondary-button">
                Start Booking
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" aria-label="Haircut and beard reference directions">
            <figure className="relative aspect-[4/5] overflow-hidden border border-gold/25 bg-black">
              <Image
                src="/images/styles/02-taper-beard.jpg"
                alt="Low taper with natural curls from Casper's portfolio"
                fill
                sizes="(max-width: 1023px) 46vw, 21vw"
                className="object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-ink/90 px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-pearl">
                Haircut direction
              </figcaption>
            </figure>
            <figure className="relative aspect-[4/5] translate-y-6 overflow-hidden border border-gold/25 bg-black">
              <Image
                src="/images/styles/15-textured-quiff.jpg"
                alt="Sculpted full beard from Casper's portfolio"
                fill
                sizes="(max-width: 1023px) 46vw, 21vw"
                className="object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-ink/90 px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-pearl">
                Beard direction
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="light-panel">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-28">
          <div className="space-y-6">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.34em] text-ink/60">
              The appointment
            </p>
            <h2 className="max-w-xl font-display text-4xl leading-tight tracking-tight sm:text-6xl">
              Your next cut, without the guesswork.
            </h2>
            <p className="max-w-lg text-sm leading-7 text-ink/65">
              Booksy is Casper&apos;s one live calendar. The service menu, open times,
              current pricing, and terms stay together in one place.
            </p>
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center justify-center border border-ink bg-ink px-7 py-3 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-pearl transition hover:bg-espresso"
            >
              Start Booking
            </Link>
          </div>
          <ol className="border-t border-ink/20">
            {bookingSteps.map((step) => (
              <li
                key={step.number}
                className="grid gap-3 border-b border-ink/20 py-6 sm:grid-cols-[4rem_1fr_1.35fr] sm:items-start"
              >
                <p className="text-[0.68rem] font-bold tracking-[0.28em] text-ink/65">
                  {step.number}
                </p>
                <h3 className="font-display text-xl text-ink">{step.title}</h3>
                <p className="text-sm leading-6 text-ink/60">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-32">
        <div className="relative min-h-80 overflow-hidden border border-gold/25 bg-black sm:min-h-[30rem]">
          <Image
            src={BRAND_LOGO_PATH}
            alt="Redeemed Precision Grooming — Premium Barbering"
            fill
            sizes="(max-width: 1023px) 100vw, 43vw"
            className="object-contain p-2 sm:p-8"
          />
          <div className="absolute inset-5 border border-gold/20" aria-hidden="true" />
        </div>
        <div className="space-y-6">
          <p className="eyebrow">Meet Casper</p>
          <h2 className="section-title">Thirty years. One enduring standard.</h2>
          <p className="max-w-xl text-sm leading-8 text-pearl/60">
            {business.bio}
          </p>
          <p className="border-l border-gold pl-5 font-display text-xl italic leading-8 text-pearl/85">
            The client always comes first.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/styles" className="secondary-button">
              View the Work
            </Link>
            <Link href="/#reviews" className="primary-button">
              Read Client Reviews
            </Link>
          </div>
        </div>
      </section>

      <ReviewSection />

      <section className="border-y border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl space-y-10 px-5 py-24 sm:px-8 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="eyebrow">Selected work</p>
              <h2 id="gallery-heading" className="section-title">
                The portfolio.
              </h2>
            </div>
            <Link href="/styles" className="secondary-button">
              View All Styles
            </Link>
          </div>
          <Gallery items={haircutStyles.slice(0, 12)} showFilter={false} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid border border-gold/25 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-gold/25 bg-espresso p-8 sm:p-12 lg:border-b-0 lg:border-r">
            <p className="eyebrow">Visit</p>
            <h2 className="mt-5 font-display text-4xl leading-tight text-pearl sm:text-5xl">
              Ridgefield,
              <span className="block italic text-gold">New Jersey.</span>
            </h2>
            <p className="mt-7 text-sm text-pearl/65">{locationDisplay}</p>
          </div>
          <div className="flex flex-col justify-center gap-6 p-8 sm:p-12">
            <p className="max-w-xl text-sm leading-7 text-pearl/60">
              Casper&apos;s current Booksy profile lists {locationDisplay}. Confirm the
              appointment time and location on Booksy before traveling.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="primary-button"
              >
                Check Availability
              </Link>
              <span className="inline-flex min-h-12 items-center border border-white/15 px-5 py-3 text-xs leading-5 text-pearl/60">
                Current Booksy listing
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="policies" className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 text-sm sm:px-8 md:grid-cols-[0.8fr_1.2fr]">
          <p className="eyebrow">Before you confirm</p>
          <div className="space-y-4 leading-7 text-pearl/55">
            <p>
              Current cancellation, payment, and service-specific terms appear during
              the Booksy booking process. Review them there before confirming.
            </p>
            <Link
              href="/book"
              className="font-semibold text-pearl underline decoration-gold underline-offset-8"
            >
              Read booking details
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
