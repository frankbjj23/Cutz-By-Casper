import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const CONSENT_VERSION = "2026-09-01-v1";
const MAX_REQUESTS_PER_DAY = 4;
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};
const ALLOWED_SITE_ORIGINS = new Set([
  "https://redeemedbycasper.com",
  "https://www.redeemedbycasper.com",
  "https://cutz-by-casper-umri.vercel.app",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3100",
  "http://localhost:3000",
]);

type SecretKeyDictionary = Record<string, string>;

function json(status: number, body: unknown, retryAfter?: number) {
  const headers: Record<string, string> = { ...RESPONSE_HEADERS };
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  return new Response(JSON.stringify(body), { status, headers });
}

function readKeyDictionary(name: string): SecretKeyDictionary {
  try {
    return JSON.parse(Deno.env.get(name) ?? "{}") as SecretKeyDictionary;
  } catch {
    return {};
  }
}

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function verifyHmac(value: string, secret: string, signatureHex: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(signatureHex),
    new TextEncoder().encode(value),
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json(405, { error: { code: "METHOD_NOT_ALLOWED" } });
  }

  const siteOrigin = request.headers.get("x-redeemed-site-origin") ?? "";
  if (!ALLOWED_SITE_ORIGINS.has(siteOrigin)) {
    return json(403, { error: { code: "ORIGIN_DENIED" } });
  }

  const suppliedKey = request.headers.get("apikey") ?? "";
  const publishableKeys = Object.values(readKeyDictionary("SUPABASE_PUBLISHABLE_KEYS"));
  const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (
    !suppliedKey ||
    (!publishableKeys.includes(suppliedKey) && suppliedKey !== legacyAnonKey)
  ) {
    return json(401, { error: { code: "ACCESS_DENIED" } });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return json(415, { error: { code: "CONTENT_TYPE" } });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) {
    return json(413, { error: { code: "REQUEST_TOO_LARGE" } });
  }

  const receiverSecret = Deno.env.get("REVIEW_RECEIVER_SECRET")?.trim() ?? "";
  const timestamp = request.headers.get("x-redeemed-timestamp") ?? "";
  const requestId = request.headers.get("x-redeemed-request-id") ?? "";
  const suppliedSignature = request.headers.get("x-redeemed-signature") ?? "";
  const networkAddress = request.headers.get("x-redeemed-client-ip")?.trim() ?? "";
  const timestampSeconds = Number(timestamp);
  if (!/^[0-9a-f]{64}$/.test(receiverSecret)) {
    console.error("review.receiver_secret_missing");
    return json(503, { error: { code: "STORAGE_UNAVAILABLE" } });
  }
  if (
    !/^\d{10,13}$/.test(timestamp) ||
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) >
      MAX_SIGNATURE_AGE_SECONDS ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    ) ||
    !/^v1=[0-9a-f]{64}$/.test(suppliedSignature) ||
    networkAddress.length < 1 ||
    networkAddress.length > 128 ||
    /[\r\n]/.test(siteOrigin) ||
    /[\r\n]/.test(networkAddress)
  ) {
    return json(401, { error: { code: "ACCESS_DENIED" } });
  }

  const canonicalSignatureInput = [
    "redeemed-review-v1",
    "POST",
    "/functions/v1/capture-review",
    timestamp,
    requestId,
    siteOrigin,
    networkAddress,
    await sha256Hex(rawBody),
  ].join("\n");
  const signatureValid = await verifyHmac(
    canonicalSignatureInput,
    receiverSecret,
    suppliedSignature.slice(3),
  );
  if (!signatureValid) {
    return json(401, { error: { code: "ACCESS_DENIED" } });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json(400, { error: { code: "INVALID_REQUEST" } });
  }

  const displayName =
    typeof body.displayName === "string"
      ? body.displayName.trim().replace(/\s+/g, " ")
      : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rating = typeof body.rating === "number" ? body.rating : Number.NaN;
  const reviewText =
    typeof body.reviewText === "string"
      ? body.reviewText.trim().replace(/\s+/g, " ")
      : "";
  const consentedAt =
    typeof body.consentedAt === "string" ? new Date(body.consentedAt) : null;

  if (
    displayName.length < 2 ||
    displayName.length > 60 ||
    email.length < 5 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    reviewText.length < 20 ||
    reviewText.length > 1000 ||
    body.consentVersion !== CONSENT_VERSION ||
    body.sourcePath !== "/reviews" ||
    !consentedAt ||
    !Number.isFinite(consentedAt.getTime()) ||
    Math.abs(Date.now() - consentedAt.getTime()) > 5 * 60 * 1000
  ) {
    return json(400, { error: { code: "INVALID_REVIEW" } });
  }

  const secretKeys = readKeyDictionary("SUPABASE_SECRET_KEYS");
  const secretKey =
    secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!secretKey || !supabaseUrl) {
    console.error("review.edge_configuration_missing");
    return json(503, { error: { code: "STORAGE_UNAVAILABLE" } });
  }

  const networkFingerprint = await hmacSha256(networkAddress, secretKey);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("review_capture_events")
    .select("id", { count: "exact", head: true })
    .eq("network_fingerprint", networkFingerprint)
    .gte("created_at", dayAgo);
  if (countError) {
    console.error("review.rate_check_failed", { code: countError.code });
    return json(503, { error: { code: "STORAGE_UNAVAILABLE" } });
  }
  if ((count ?? 0) >= MAX_REQUESTS_PER_DAY) {
    return json(429, { error: { code: "RATE_LIMITED" } }, 86_400);
  }

  const { error: captureError } = await supabase.rpc("capture_review_submission_v2", {
    p_display_name: displayName,
    p_email: email,
    p_rating: rating,
    p_review_text: reviewText,
    p_consent_version: CONSENT_VERSION,
    p_consented_at: consentedAt.toISOString(),
    p_source_path: "/reviews",
    p_network_fingerprint: networkFingerprint,
    p_receiver_request_id: requestId,
  });
  if (captureError) {
    if (captureError.message === "review_rate_limited") {
      return json(429, { error: { code: "RATE_LIMITED" } }, 86_400);
    }
    console.error("review.capture_failed", { code: captureError.code });
    return json(503, { error: { code: "STORAGE_UNAVAILABLE" } });
  }

  return json(201, { ok: true });
});
