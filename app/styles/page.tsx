import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import { haircutStyles } from "@/lib/gallery";
import { BOOKSY_URL, SITE_URL } from "@/lib/site";

const description =
  "Browse Casper's barbering portfolio, including fades, tapers, textured cuts, beard work, and line-ups.";

export const metadata: Metadata = {
  title: "Haircut Style Gallery",
  description,
  alternates: {
    canonical: "/styles",
  },
  openGraph: {
    title: "Haircut Style Gallery | Cutz By Casper",
    description,
    url: SITE_URL + "/styles",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Haircut Style Gallery | Cutz By Casper",
    description,
    images: ["/og.png"],
  },
};

export default function StylesPage() {
  return (
    <main id="main-content" className="mx-auto flex max-w-6xl flex-col gap-12 px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
      <section className="space-y-5">
        <p className="eyebrow">Style gallery</p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Precision work. Real results.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-ink/70">
          Browse Casper&apos;s work across fades, tapers, textured styles, beard shaping,
          and detailed line-ups.
        </p>
        <a
          href={BOOKSY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-button"
        >
          View Live Times
        </a>
      </section>

      <Gallery items={haircutStyles} showFilter />
    </main>
  );
}
