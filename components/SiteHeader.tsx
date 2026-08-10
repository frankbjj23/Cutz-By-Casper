import Image from "next/image";
import Link from "next/link";
import { BOOKSY_URL, BRAND_MARK_PATH } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link
          href="/"
          aria-label="Redeemed Precision Grooming home"
          className="group flex min-w-0 items-center gap-3 text-pearl"
        >
          <Image
            src={BRAND_MARK_PATH}
            alt=""
            width={48}
            height={48}
            sizes="48px"
            className="size-10 shrink-0 border border-gold/45 object-cover transition group-hover:border-gold sm:size-12"
          />
          <span className="min-w-0 leading-none">
            <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.25em] text-gold sm:text-[0.62rem]">
              Redeemed
            </span>
            <span className="mt-1 block whitespace-nowrap font-display text-[0.64rem] uppercase tracking-[0.1em] sm:text-sm sm:tracking-[0.16em]">
              Precision Grooming
            </span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-4 sm:gap-5" aria-label="Primary navigation">
          <Link
            href="/styles"
            className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-pearl/65 transition hover:text-gold sm:inline"
          >
            Portfolio
          </Link>
          <a
            href={BOOKSY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Book on Booksy (opens in a new tab)"
            className="border border-gold bg-gold px-4 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink transition hover:bg-pearl sm:px-5 sm:tracking-[0.22em]"
          >
            Book
          </a>
        </nav>
      </div>
    </header>
  );
}
