import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-16">
      <div className="lux-card p-8">
        <h1 className="section-title">Checkout canceled</h1>
        <p className="mt-4 text-sm text-ink/70">
          Your deposit was not captured. You can restart booking any time.
        </p>
        <Link
          href="/book"
          className="mt-6 inline-flex rounded-full border border-ink px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
        >
          Return to booking
        </Link>
      </div>
    </div>
  );
}
