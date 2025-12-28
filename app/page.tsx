import Image from "next/image";
import Link from "next/link";
import Gallery from "@/components/Gallery";
import { casperProfile, haircutStyles } from "@/lib/gallery";
import AIAssistantOpenButton from "@/components/AIAssistantOpenButton";

const servicesPreview = [
  { name: "Haircut (No Beard)", duration: "45 min", price: "$55" },
  { name: "Haircut (With Beard)", duration: "60 min", price: "$70" },
  { name: "Gentlemen haircut / shape up", duration: "30 min", price: "$35" },
];

const businessDetails = {
  address: "442 Ridge Rd, Lyndhurst, NJ 07071",
  phoneDisplay: "(201) 889-6440",
  phoneE164: "+12018896440",
  rating: "5.0 (57 reviews)",
  hours: [
    { day: "Sunday", hours: "09:00–13:00" },
    { day: "Monday", hours: "Closed" },
    { day: "Tuesday", hours: "Closed" },
    { day: "Wednesday", hours: "11:00–18:00" },
    { day: "Thursday", hours: "10:00–19:00" },
    { day: "Friday", hours: "12:00–19:00" },
    { day: "Saturday", hours: "10:00–17:00" },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-fog bg-pearl/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold tracking-[0.35em] uppercase text-ink">
            Cutz By Casper
          </div>
          <Link
            href="/book"
            className="rounded-full border border-ink px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-ink hover:text-pearl"
          >
            Book Now
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16">
        <section className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-ink/70">New York City</p>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              Precision cuts. Calm atmosphere. A ritual designed for you.
            </h1>
            <p className="max-w-xl text-base text-ink/70">
              Casper offers a single-chair experience with curated timing, deliberate detail,
              and discreet service. Each appointment is focused, unhurried, and tailored.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/book"
                className="rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-ink/90"
              >
                Reserve Your Slot
              </Link>
              <a
                href={`tel:${businessDetails.phoneE164}`}
                className="rounded-full border border-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-ink hover:text-pearl"
              >
                Call
              </a>
              <a
                href="#policies"
                className="rounded-full border border-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-ink hover:text-pearl"
              >
                View Policies
              </a>
            </div>
          </div>
          <div className="lux-card flex flex-col justify-between gap-6 p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-ink/60">Availability</p>
              <h2 className="section-title mt-3">Book in under 60 seconds.</h2>
            </div>
            <div className="space-y-4 text-sm text-ink/70">
              <p>Deposit-secured appointments.</p>
              <p>Clean, quiet studio environment.</p>
              <p>One client at a time. No overlaps.</p>
            </div>
            <Link
              href="/book"
              className="rounded-full bg-gold px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-[#d9b173]"
            >
              Book Now
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {servicesPreview.map((service) => (
            <div key={service.name} className="lux-card p-6">
              <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
              <div className="mt-2 text-sm text-ink/70">
                <p>{service.duration}</p>
                <p>{service.price}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="lux-card grid gap-6 p-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-ink/70">Book by voice</p>
            <h2 className="section-title">Book by voice with our AI Secretary.</h2>
            <p className="text-sm text-ink/70">
              Tell the assistant what you want, pick a time, and confirm. It will
              pull live availability and generate your Stripe deposit link.
            </p>
            <AIAssistantOpenButton label="Open AI Secretary" />
          </div>
          <div className="space-y-3 text-sm text-ink/70">
            <p>Real-time availability. No guessing.</p>
            <p>Deposit policy confirmed before checkout.</p>
            <p>Hands-free flow for mobile clients.</p>
          </div>
        </section>

        <section className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="lux-card overflow-hidden">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={casperProfile.src}
                alt={casperProfile.alt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.4em] text-ink/70">Meet Casper</p>
            <h2 className="section-title">Single-chair, detail-first.</h2>
            <p className="text-sm text-ink/70">
              Casper brings a calm, bespoke approach to every cut. Expect a clean studio,
              precision work, and a style consultation that leaves nothing to chance.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/book"
                className="rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-ink/90"
              >
                Book Now
              </Link>
              <Link
                href="/styles"
                className="rounded-full border border-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-ink hover:text-pearl"
              >
                View Styles
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-ink/70">Style Gallery</p>
              <h2 className="section-title">A curated lookbook.</h2>
            </div>
            <Link
              href="/styles"
              className="rounded-full border border-ink px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-ink hover:text-pearl"
            >
              View all styles
            </Link>
          </div>
          <Gallery items={haircutStyles.slice(0, 12)} showFilter={false} />
        </section>

        <section className="lux-card p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-ink/70">Visit</p>
              <h2 className="section-title">Lyndhurst studio.</h2>
              <div className="space-y-2 text-sm text-ink/70">
                <a
                  className="block underline-offset-4 hover:underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    businessDetails.address
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {businessDetails.address}
                </a>
                <a
                  className="block underline-offset-4 hover:underline"
                  href={`tel:${businessDetails.phoneE164}`}
                >
                  {businessDetails.phoneDisplay}
                </a>
                <p className="text-xs uppercase tracking-[0.3em] text-ink/60">
                  {businessDetails.rating}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-ink/90"
                >
                  Book Now
                </Link>
                <a
                  href={`tel:${businessDetails.phoneE164}`}
                  className="rounded-full border border-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
                >
                  Call
                </a>
              </div>
            </div>
            <div className="space-y-2 text-sm text-ink/70">
              <p className="text-xs uppercase tracking-[0.3em] text-ink/60">Hours</p>
              <ul className="space-y-1">
                {businessDetails.hours.map((item) => (
                  <li key={item.day} className="flex items-center justify-between gap-6">
                    <span className="font-semibold text-ink">{item.day}</span>
                    <span>{item.hours}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-[1fr_1fr]">
          <div className="lux-card p-8">
            <h2 className="section-title">Private studio.</h2>
            <p className="mt-4 text-sm text-ink/70">
              Casper focuses on tailored cuts and beard work, with an emphasis on consistency.
              Every appointment is a reset and a refinement.
            </p>
          </div>
          <div className="lux-card p-8">
            <h2 className="section-title">Client feedback.</h2>
            <p className="mt-4 text-sm text-ink/70">
              "Immaculate attention to detail. The quiet, focused experience is unmatched."
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-ink/60">- Marcus L.</p>
          </div>
        </section>

        <section id="policies" className="lux-card p-8">
          <h2 className="section-title">Policies</h2>
          <ul className="mt-6 space-y-3 text-sm text-ink/70">
            <li>$20 deposit secures every booking.</li>
            <li>Reschedule 72+ hours before your appointment.</li>
            <li>15+ minutes late is a no-show and deposit is forfeited.</li>
            <li>Deposit is non-refundable.</li>
            <li className="text-ink">STRICT POLICY ON 24hr CANCELLATIONS</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
