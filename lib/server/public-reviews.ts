import "server-only";

import {
  FEATURED_BOOKSY_REVIEWS,
  type PublishedReview,
} from "@/lib/reviews";
import { getBookingSupabaseConfig } from "@/lib/supabase/config";

const PUBLIC_REVIEW_FIELDS = [
  "id",
  "source",
  "display_name",
  "rating",
  "review_text",
  "service_name",
  "reviewed_at",
  "confirmed_client",
  "source_url",
].join(",");

export async function getPublishedReviews(): Promise<PublishedReview[]> {
  const config = getBookingSupabaseConfig();
  if (!config) return FEATURED_BOOKSY_REVIEWS;

  const query = new URLSearchParams({
    select: PUBLIC_REVIEW_FIELDS,
    active: "eq.true",
    order: "display_order.asc,published_at.desc",
    limit: "6",
  });

  try {
    const response = await fetch(
      `${config.url.replace(/\/$/, "")}/rest/v1/published_reviews?${query}`,
      {
        headers: { apikey: config.publishableKey },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(3_000),
      },
    );
    if (!response.ok) return FEATURED_BOOKSY_REVIEWS;

    const reviews = (await response.json()) as PublishedReview[];
    return reviews;
  } catch {
    return FEATURED_BOOKSY_REVIEWS;
  }
}
