import Link from "next/link";
import { BOOKSY_URL } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 text-pearl"
        >
          <span
            className="grid size-9 place-items-center border border-gold/60 font-display text-lg text-gold transition group-hover:border-gold"
            aria-hidden="true"
          >
            C
          </span>
          <span className="leading-none">
            <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold">
              Cutz by
            </span>
            <span className="mt-1 block font-display text-base uppercase tracking-[0.2em] sm:text-lg">
              Casper
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-5" aria-label="Primary navigation">
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
