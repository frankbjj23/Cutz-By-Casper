import { NextResponse } from "next/server";
import { validateReviewSubmission } from "@/lib/reviews";
import {
  getRequestNetworkAddress,
} from "@/lib/server/booking-contact-rate";
import { consumeReviewRateLimit } from "@/lib/server/review-rate";
import { signReviewPayload } from "@/lib/server/review-signature";
import { SITE_URL } from "@/lib/site";
import {
  CURRENT_BOOKING_SUPABASE_PUBLISHABLE_KEY,
  CURRENT_BOOKING_SUPABASE_URL,
} from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function jsonError(status: number, code: string, message: string, retryAfter?: number) {
  const headers: Record<string, string> = { ...RESPONSE_HEADERS };
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

function retryAfterSeconds(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  const allowedOrigin =
    process.env.REVIEW_ALLOWED_ORIGIN ??
    (process.env.NODE_ENV === "production" ? SITE_URL : expectedOrigin);
  const isSameOriginBrowserRequest =
    origin === allowedOrigin ||
    (!origin && request.headers.get("sec-fetch-site") === "same-origin");
  if (!isSameOriginBrowserRequest) {
    return jsonError(
      403,
      "ORIGIN_DENIED",
      "This request must come from the Redeemed Precision Grooming site.",
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonError(415, "CONTENT_TYPE", "The review request must be JSON.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024) {
    return jsonError(413, "REQUEST_TOO_LARGE", "The review request is too large.");
  }

  const rateLimit = consumeReviewRateLimit(request);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many reviews were sent from this network. Try again tomorrow.",
      retryAfterSeconds(rateLimit.resetAt),
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_REQUEST", "The review request could not be read.");
  }

  const validation = validateReviewSubmission(body);
  if (!validation.ok) {
    return jsonError(400, "INVALID_REVIEW", validation.message);
  }
  if (validation.honeypotTriggered) {
    return NextResponse.json({ ok: true }, { status: 201, headers: RESPONSE_HEADERS });
  }

  const receiverUrl =
    process.env.REVIEW_SUPABASE_URL?.trim() || CURRENT_BOOKING_SUPABASE_URL;
  const receiverKey =
    process.env.REVIEW_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    CURRENT_BOOKING_SUPABASE_PUBLISHABLE_KEY;
  const receiverSecret = process.env.REVIEW_RECEIVER_SECRET?.trim() ?? "";
  if (!/^[0-9a-f]{64}$/.test(receiverSecret)) {
    console.error("review.receiver_secret_missing");
    return jsonError(
      503,
      "STORAGE_UNAVAILABLE",
      "The private review box is temporarily unavailable. Please try again later.",
    );
  }

  const payload = JSON.stringify(validation.value);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = crypto.randomUUID();
  const clientIp = getRequestNetworkAddress(request);
  const signature = signReviewPayload(receiverSecret, {
    timestamp,
    requestId,
    siteOrigin: allowedOrigin,
    clientIp,
    payload,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(`${receiverUrl}/functions/v1/capture-review`, {
      method: "POST",
      headers: {
        apikey: receiverKey,
        "content-type": "application/json",
        "x-redeemed-site-origin": allowedOrigin,
        "x-redeemed-client-ip": clientIp,
        "x-redeemed-timestamp": timestamp,
        "x-redeemed-request-id": requestId,
        "x-redeemed-signature": `v1=${signature}`,
      },
      body: payload,
      cache: "no-store",
      signal: controller.signal,
    });

    if (upstream.ok) {
      return NextResponse.json({ ok: true }, { status: 201, headers: RESPONSE_HEADERS });
    }

    if (upstream.status === 429) {
      return jsonError(
        429,
        "RATE_LIMITED",
        "Too many reviews were sent from this network. Try again tomorrow.",
        Number(upstream.headers.get("retry-after") ?? 86_400),
      );
    }

    console.error("review.upstream_rejected", { status: upstream.status });
    return jsonError(
      503,
      "STORAGE_UNAVAILABLE",
      "The private review box is temporarily unavailable. Please try again later.",
    );
  } catch (error) {
    console.error("review.upstream_failure", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return jsonError(
      503,
      "STORAGE_UNAVAILABLE",
      "The private review box is temporarily unavailable. Please try again later.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function GET() {
  return jsonError(405, "METHOD_NOT_ALLOWED", "Use POST to submit a review.");
}
