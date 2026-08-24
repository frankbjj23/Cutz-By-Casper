"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function MobileBookingBar() {
  const pathname = usePathname();
  if (pathname === "/preview" || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
      <Link
        href="/book"
        aria-label="View live availability and start booking"
        className="block border border-gold bg-gold px-5 py-3 text-center text-[0.7rem] font-bold uppercase tracking-[0.22em] text-ink shadow-soft"
      >
        Start Booking
      </Link>
    </div>
  );
}
