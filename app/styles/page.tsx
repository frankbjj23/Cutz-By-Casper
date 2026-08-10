import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import { haircutStyles } from "@/lib/gallery";
import { BOOKSY_URL, BRAND_OG_PATH, business, SITE_URL } from "@/lib/site";

const description =
  "Browse Casper's work at Redeemed Precision Grooming, including fades, tapers, textured cuts, beard work, and line-ups.";

export const metadata: Metadata = {
  title: "Haircut Style Gallery",
  description,
  alternates: {
    canonical: "/styles",
  },
  openGraph: {
    title: `Haircut Style Gallery | ${business.name}`,
    description,
    url: SITE_URL + "/styles",
    siteName: business.name,
    images: [BRAND_OG_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: `Haircut Style Gallery | ${business.name}`,
    description,
    images: [BRAND_OG_PATH],
  },
};

export default function StylesPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-7xl flex-col gap-16 px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <section className="grid gap-10 border-b border-white/10 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-6">
          <p className="eyebrow">Selected work</p>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-pearl sm:text-7xl">
            A study in
            <span className="block italic text-gold">precision.</span>
          </h1>
        </div>
        <div className="space-y-6">
          <p className="max-w-2xl text-base leading-8 text-pearl/60">
            Explore Casper&apos;s work across fades, tapers, textured styles, beard
            shaping, and detailed line-ups.
          </p>
          <a
            href={BOOKSY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            Reserve an Appointment
          </a>
        </div>
      </section>

      <section aria-labelledby="portfolio-heading" className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="editorial-rule" aria-hidden="true" />
          <h2 id="portfolio-heading" className="eyebrow">
            The portfolio
          </h2>
        </div>
        <Gallery items={haircutStyles} showFilter />
      </section>
    </main>
  );
}
