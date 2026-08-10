import Link from "next/link";
import { addressDisplay, BOOKSY_URL, mapsUrl } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/25">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 text-sm text-pearl/60 sm:grid-cols-2 sm:items-end sm:px-8">
        <div className="space-y-3">
          <p className="font-display text-xl uppercase tracking-[0.2em] text-pearl">
            Cutz By Casper
          </p>
          <p className="max-w-sm text-xs uppercase tracking-[0.2em] text-gold">
            Refined barbering in Lyndhurst
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block underline-offset-4 hover:text-pearl hover:underline"
          >
            {addressDisplay}
          </a>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs uppercase tracking-[0.16em] sm:justify-end">
          <Link href="/styles" className="hover:text-gold">
            Portfolio
          </Link>
          <Link href="/book" className="hover:text-gold">
            Booking details
          </Link>
          <a
            href={BOOKSY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold"
          >
            Booksy
          </a>
          <Link href="/privacy" className="hover:text-gold">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
