import Link from "next/link";
import { addressDisplay, BOOKSY_URL, mapsUrl } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-fog bg-white/55">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 text-sm text-ink/65 sm:grid-cols-2 sm:items-end">
        <div className="space-y-2">
          <p className="font-semibold uppercase tracking-[0.25em] text-ink">
            Cutz By Casper
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block underline-offset-4 hover:text-ink hover:underline"
          >
            {addressDisplay}
          </a>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
          <Link href="/styles" className="hover:text-ink">
            Styles
          </Link>
          <Link href="/book" className="hover:text-ink">
            Booking details
          </Link>
          <a
            href={BOOKSY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
          >
            Booksy
          </a>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
