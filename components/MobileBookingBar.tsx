import { BOOKSY_URL } from "@/lib/site";

export default function MobileBookingBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
      <a
        href={BOOKSY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View live availability and book on Booksy (opens in a new tab)"
        className="block border border-gold bg-gold px-5 py-3 text-center text-[0.7rem] font-bold uppercase tracking-[0.22em] text-ink shadow-soft"
      >
        Reserve on Booksy
      </a>
    </div>
  );
}
