import Link from "next/link";
import { BOOKSY_URL } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-fog/90 bg-pearl/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.28em] text-ink sm:text-lg sm:tracking-[0.35em]"
        >
          Cutz By Casper
        </Link>
        <nav className="flex items-center gap-3" aria-label="Primary navigation">
          <Link
            href="/styles"
            className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-ink/70 transition hover:text-ink sm:inline"
          >
            Styles
          </Link>
          <a
            href={BOOKSY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Book on Booksy (opens in a new tab)"
            className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-pearl transition hover:bg-ink/85 sm:px-5 sm:tracking-[0.2em]"
          >
            Book
          </a>
        </nav>
      </div>
    </header>
  );
}
