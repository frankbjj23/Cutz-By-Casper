/** @jsxImportSource react */
import { normalizeGoogleReviewUrl } from "@/lib/google-reviews";

type GoogleReviewInvitationProps = {
  reviewUrl?: string;
};

export default function GoogleReviewInvitation({
  reviewUrl = process.env.GOOGLE_REVIEW_URL,
}: GoogleReviewInvitationProps) {
  const href = normalizeGoogleReviewUrl(reviewUrl);
  if (!href) return null;

  return (
    <section
      aria-label="Leave a Google review"
      className="mt-8 space-y-5 border border-gold/30 bg-black/20 p-6 sm:p-8"
    >
      <div className="space-y-3">
        <p className="eyebrow">Google reviews</p>
        <h3 className="font-display text-3xl leading-tight text-pearl">
          Share your experience on Google.
        </h3>
        <p className="max-w-2xl text-sm leading-7 text-pearl/60">
          Visited Casper? Share your honest experience. This opens Google in a new
          tab, where you sign in to your Google account and submit your review.
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="primary-button"
      >
        Review Us on Google
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <p className="max-w-2xl text-xs leading-6 text-pearl/55">
        Google publishes and manages these reviews. Sending a review through this
        website does not post it to Google or Booksy.
      </p>
    </section>
  );
}
