import Link from "next/link";
import { getPublishedReviews } from "@/lib/server/public-reviews";
import { BOOKSY_REVIEWS_URL } from "@/lib/site";

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      className="text-sm tracking-[0.28em] text-gold"
    >
      {"★".repeat(rating)}
    </span>
  );
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function ReviewSection() {
  const reviews = await getPublishedReviews();

  return (
    <section id="reviews" className="scroll-mt-24 border-y border-gold/20 bg-black/25">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-28">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <p className="eyebrow">Client experiences</p>
            <h2 className="section-title">A reputation built in the chair.</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-pearl/60 lg:justify-self-end">
            Booksy highlights come from confirmed clients on Casper&apos;s public profile.
            Reviews sent through this website are published only after staff approval and
            are labeled separately.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="flex min-h-72 flex-col justify-between border border-white/10 bg-[#111113] p-7 shadow-soft sm:p-8"
            >
              <div>
                <ReviewStars rating={review.rating} />
                <blockquote className="mt-7 font-display text-2xl leading-9 text-pearl">
                  “{review.review_text}”
                </blockquote>
              </div>
              <footer className="mt-10 border-t border-white/10 pt-5">
                <p className="font-semibold text-pearl">{review.display_name}</p>
                <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-gold">
                  {review.source === "booksy" && review.confirmed_client
                    ? "Confirmed Booksy client"
                    : "Redeemed website review"}
                </p>
                {review.reviewed_at ? (
                  <p className="mt-1 text-xs leading-5 text-pearl/55">
                    {formatReviewDate(review.reviewed_at)}
                  </p>
                ) : null}
              </footer>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5">
          <p className="max-w-xl text-xs leading-6 text-pearl/55">
            Review totals can change. Booksy shows Casper&apos;s current rating and complete
            review history at the source.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/reviews" className="primary-button">
              Leave a Review Here
            </Link>
            <a
              href={BOOKSY_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button"
            >
              View All on Booksy
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
