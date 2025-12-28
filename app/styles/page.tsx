import Link from "next/link";
import Gallery from "@/components/Gallery";
import { haircutStyles } from "@/lib/gallery";

export default function StylesPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-16">
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-ink/70">Style Gallery</p>
        <h1 className="font-display text-4xl leading-tight md:text-5xl">
          Elevated cuts. Real results.
        </h1>
        <p className="max-w-2xl text-base text-ink/70">
          Browse Casper&apos;s recent work across fades, tapers, beard shaping, and
          textured styles. Every cut is custom to the client and finished with precise detail.
        </p>
        <Link
          href="/book"
          className="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-ink/90"
        >
          Book Now
        </Link>
      </section>

      <Gallery items={haircutStyles} showFilter />
    </main>
  );
}
