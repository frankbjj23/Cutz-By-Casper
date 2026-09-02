import { BOOKSY_REVIEWS_URL } from "@/lib/site";

export const REVIEW_CONSENT_VERSION = "2026-09-01-v1";

export type ReviewSource = "booksy" | "website";

export type PublishedReview = {
  id: string;
  source: ReviewSource;
  display_name: string;
  rating: number;
  review_text: string;
  service_name: string | null;
  reviewed_at: string | null;
  confirmed_client: boolean;
  source_url: string | null;
};

export type ReviewSubmission = {
  displayName: string;
  email: string;
  rating: number;
  reviewText: string;
  consentVersion: typeof REVIEW_CONSENT_VERSION;
  consentedAt: string;
  sourcePath: "/reviews";
};

type ReviewValidationResult =
  | { ok: true; value: ReviewSubmission; honeypotTriggered: boolean }
  | { ok: false; message: string };

// These short excerpts were verified on Casper's public Booksy profile on
// September 1, 2026. The site intentionally does not freeze a changing review
// total; visitors can follow the source link for Booksy's current count.
export const FEATURED_BOOKSY_REVIEWS: PublishedReview[] = [
  {
    id: "booksy-mauricio-sharp-cut",
    source: "booksy",
    display_name: "Mauricio",
    rating: 5,
    review_text: "Super sharp cut today.",
    service_name: "HAIRCUT NO BEARD",
    reviewed_at: "2026-02-27",
    confirmed_client: true,
    source_url: BOOKSY_REVIEWS_URL,
  },
  {
    id: "booksy-danny-craft",
    source: "booksy",
    display_name: "Danny",
    rating: 5,
    review_text: "A man of his craft, never disappoints!",
    service_name: "Gentlemen haircut/ shape up",
    reviewed_at: "2025-08-06",
    confirmed_client: true,
    source_url: BOOKSY_REVIEWS_URL,
  },
  {
    id: "booksy-david-best-in-jersey",
    source: "booksy",
    display_name: "David",
    rating: 5,
    review_text: "HANDS DOWN THE BEST BARBER IN JERSEY",
    service_name: "HAIRCUT NO BEARD",
    reviewed_at: "2025-01-20",
    confirmed_client: true,
    source_url: BOOKSY_REVIEWS_URL,
  },
];

export function validateReviewSubmission(input: unknown): ReviewValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Complete the review form to continue." };
  }

  const body = input as Record<string, unknown>;
  const displayName =
    typeof body.displayName === "string"
      ? body.displayName.trim().replace(/\s+/g, " ")
      : "";
  if (displayName.length < 2 || displayName.length > 60) {
    return { ok: false, message: "Enter the name you want shown with your review." };
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (
    email.length < 5 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const rating =
    typeof body.rating === "number"
      ? body.rating
      : typeof body.rating === "string"
        ? Number(body.rating)
        : Number.NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Choose a rating from one to five stars." };
  }

  const reviewText =
    typeof body.reviewText === "string"
      ? body.reviewText.trim().replace(/\s+/g, " ")
      : "";
  if (reviewText.length < 20 || reviewText.length > 1000) {
    return { ok: false, message: "Write between 20 and 1,000 characters." };
  }

  if (body.consent !== true || body.consentVersion !== REVIEW_CONSENT_VERSION) {
    return { ok: false, message: "Agree to the review notice before sending." };
  }

  return {
    ok: true,
    honeypotTriggered:
      typeof body.company === "string" && body.company.trim().length > 0,
    value: {
      displayName,
      email,
      rating,
      reviewText,
      consentVersion: REVIEW_CONSENT_VERSION,
      consentedAt: new Date().toISOString(),
      sourcePath: "/reviews",
    },
  };
}
