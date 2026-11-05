import Image from "next/image";
import Link from "next/link";
import {
  BRAND_MARK_PATH,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  business,
  locationDisplay,
} from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/25">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 text-sm text-pearl/60 sm:grid-cols-2 sm:items-end sm:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Image
              src={BRAND_MARK_PATH}
              alt=""
              width={56}
              height={56}
              sizes="56px"
              className="size-14 border border-gold/40 object-cover"
            />
            <div>
              <p className="font-display text-lg uppercase tracking-[0.14em] text-pearl">
                {business.name}
              </p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.22em] text-gold">
                {business.descriptor} · {business.address.city}, New Jersey
              </p>
            </div>
          </div>
          <p>{locationDisplay} · Confirm appointment details on SQUIRE</p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-pearl/80 transition hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            Instagram <span className="text-gold">{INSTAGRAM_HANDLE}</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs uppercase tracking-[0.16em] sm:justify-end">
          <Link href="/styles" className="hover:text-gold">
            Portfolio
          </Link>
          <Link href="/book" className="hover:text-gold">
            Booking details
          </Link>
          <Link href="/reviews" className="hover:text-gold">
            Reviews
          </Link>
          <Link href="/book" className="hover:text-gold">
            SQUIRE booking
          </Link>
          <Link href="/privacy" className="hover:text-gold">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
