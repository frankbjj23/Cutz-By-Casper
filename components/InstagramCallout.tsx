import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export default function InstagramCallout() {
  return (
    <aside
      aria-label="Follow Casper on Instagram"
      className="flex flex-col gap-6 border border-gold/25 bg-black/20 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
    >
      <div className="min-w-0 space-y-3">
        <p className="eyebrow">Follow the craft</p>
        <p className="break-words font-display text-2xl text-pearl sm:text-3xl">
          {INSTAGRAM_HANDLE}
        </p>
        <p className="max-w-xl text-sm leading-7 text-pearl/65">
          Connect with Casper on Instagram. Book your next appointment here on the website.
        </p>
      </div>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="secondary-button shrink-0 gap-3"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-5 shrink-0"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
        </svg>
        Follow on Instagram
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}
