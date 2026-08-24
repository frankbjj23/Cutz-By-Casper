import { NextResponse } from "next/server";
import { validateBookingContactSubmission } from "@/lib/booking-contact";
import {
  consumeBookingContactRateLimit,
  getRequestNetworkAddress,
} from "@/lib/server/booking-contact-rate";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
const DEFAULT_BOOKING_CONTACT_SUPABASE_URL =
  "https://wtbcvhcwmbjthcrywuwd.supabase.co";
const DEFAULT_BOOKING_CONTACT_PUBLISHABLE_KEY =
  "sb_publishable_6oRcDDxTYi7slj9ZEoQNxA_-TdmPv55";

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
    process.env.BOOKING_CONTACT_ALLOWED_ORIGIN ??
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
    return jsonError(415, "CONTENT_TYPE", "The booking contact request must be JSON.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 8 * 1024) {
    return jsonError(413, "REQUEST_TOO_LARGE", "The booking contact request is too large.");
  }

  const rateLimit = consumeBookingContactRateLimit(request);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many contact requests were sent from this network. Continue to Booksy or try again later.",
      retryAfterSeconds(rateLimit.resetAt),
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_REQUEST", "The booking contact request could not be read.");
  }

  const validation = validateBookingContactSubmission(body);
  if (!validation.ok) {
    return jsonError(400, "INVALID_CONTACT", validation.message);
  }
  if (validation.honeypotTriggered) {
    return NextResponse.json({ ok: true }, { status: 201, headers: RESPONSE_HEADERS });
  }

  const receiverUrl =
    process.env.BOOKING_CONTACT_SUPABASE_URL?.trim() ||
    DEFAULT_BOOKING_CONTACT_SUPABASE_URL;
  const receiverKey =
    process.env.BOOKING_CONTACT_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    DEFAULT_BOOKING_CONTACT_PUBLISHABLE_KEY;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(`${receiverUrl}/functions/v1/capture-booking-contact`, {
      method: "POST",
      headers: {
        apikey: receiverKey,
        authorization: `Bearer ${receiverKey}`,
        "content-type": "application/json",
        "x-redeemed-site-origin": allowedOrigin,
        "x-redeemed-client-ip": getRequestNetworkAddress(request),
      },
      body: JSON.stringify(validation.value),
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
        "Too many contact requests were sent from this network. Continue to Booksy or try again later.",
        Number(upstream.headers.get("retry-after") ?? 3600),
      );
    }

    console.error("booking_contact.upstream_rejected", { status: upstream.status });
    return jsonError(
      503,
      "STORAGE_UNAVAILABLE",
      "Contact saving is temporarily unavailable. You can still continue to Booksy.",
    );
  } catch (error) {
    console.error("booking_contact.upstream_failure", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return jsonError(
      503,
      "STORAGE_UNAVAILABLE",
      "Contact saving is temporarily unavailable. You can still continue to Booksy.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function GET() {
  return jsonError(405, "METHOD_NOT_ALLOWED", "Use POST to save a booking contact.");
}
