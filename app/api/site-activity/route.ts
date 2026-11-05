import { NextResponse } from "next/server";
import { easternDay, isActivityPath, UUID_V4 } from "@/lib/site-activity";
import { activityHash, activitySignature } from "@/lib/server/activity-signature";
import { getRequestNetworkAddress } from "@/lib/server/booking-contact-rate";
import { SITE_URL } from "@/lib/site";
import { CURRENT_BOOKING_SUPABASE_URL, CURRENT_BOOKING_SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const empty = (status: number) => new NextResponse(null, { status, headers: HEADERS });

export async function POST(request: Request) {
  const expected = process.env.SITE_ACTIVITY_ALLOWED_ORIGIN || SITE_URL;
  if (request.headers.get("origin") !== expected) return empty(403);
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1" ||
    /bot|crawler|spider|headless|preview|facebookexternalhit|slack|whatsapp/i.test(request.headers.get("user-agent") ?? "")) return empty(204);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return empty(415);
  if (Number(request.headers.get("content-length")) > 1024) return empty(413);

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return empty(400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return empty(413); }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return empty(400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return empty(400);
  const { sessionId, path } = body as Record<string, unknown>;
  if (typeof sessionId !== "string" || !UUID_V4.test(sessionId) || !isActivityPath(path)) return empty(400);

  // Domain-separated signatures reuse the existing server-to-Edge secret, never a public key.
  const secret = process.env.REVIEW_RECEIVER_SECRET?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/.test(secret)) {
    console.error("activity.receiver_configuration_missing");
    return empty(503);
  }
  const day = easternDay();
  const payload = JSON.stringify({
    sessionHash: activityHash(secret, "session", day, sessionId),
    networkHash: activityHash(secret, "network", day, getRequestNetworkAddress(request)),
    path,
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const response = await fetch(`${process.env.SITE_ACTIVITY_RECEIVER_URL || CURRENT_BOOKING_SUPABASE_URL}/functions/v1/capture-site-activity`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
      headers: {
        "Content-Type": "application/json", apikey: CURRENT_BOOKING_SUPABASE_PUBLISHABLE_KEY,
        "x-redeemed-timestamp": timestamp,
        "x-redeemed-signature": activitySignature(secret, timestamp, payload),
      }, body: payload,
    });
    if (response.ok) return empty(204);
    console.error("activity.receiver_rejected", { status: response.status });
    return empty(response.status === 429 ? 429 : 503);
  } catch {
    console.error("activity.receiver_unavailable");
    return empty(503);
  }
}
