import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const CONSENT_VERSION = "2026-08-24-v2";
const MAX_REQUESTS_PER_HOUR = 5;
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

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
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

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json(400, { error: { code: "INVALID_REQUEST" } });
  }

  const fullName =
    typeof body.fullName === "string"
      ? body.fullName.trim().replace(/\s+/g, " ")
      : "";
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null;
  const phoneE164 = body.phoneE164 ? normalizePhone(body.phoneE164) : null;
  const consentedAt =
    typeof body.consentedAt === "string" ? new Date(body.consentedAt) : null;

  if (
    fullName.length < 2 ||
    fullName.length > 100 ||
    (email !== null &&
      (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    (!email && !phoneE164) ||
    body.consentVersion !== CONSENT_VERSION ||
    body.sourcePath !== "/book" ||
    !consentedAt ||
    !Number.isFinite(consentedAt.getTime()) ||
    Math.abs(Date.now() - consentedAt.getTime()) > 5 * 60 * 1000
  ) {
    return json(400, { error: { code: "INVALID_CONTACT" } });
  }

  const secretKeys = readKeyDictionary("SUPABASE_SECRET_KEYS");
  const secretKey =
    secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!secretKey || !supabaseUrl) {
    console.error("booking_contact.edge_configuration_missing");
    return json(503, { error: { code: "STORAGE_UNAVAILABLE" } });
  }

  const networkAddress = request.headers.get("x-redeemed-client-ip")?.trim() || "unknown";
  const networkFingerprint = await hmacSha256(networkAddress, secretKey);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("booking_contact_capture_events")
    .select("id", { count: "exact", head: true })
    .eq("network_fingerprint", networkFingerprint)
    .gte("created_at", hourAgo);
  if (countError) {
    console.error("booking_contact.rate_check_failed", { code: countError.code });
    return json(503, { error: { code: "STORAGE_UNAVAILABLE" } });
  }
  if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
    return json(429, { error: { code: "RATE_LIMITED" } }, 3600);
  }

  const { error: captureError } = await supabase.rpc(
    "capture_or_merge_booking_contact",
    {
      p_full_name: fullName,
      p_email: email,
      p_phone_e164: phoneE164,
      p_consent_version: CONSENT_VERSION,
      p_consented_at: consentedAt.toISOString(),
      p_source_path: "/book",
      p_network_fingerprint: networkFingerprint,
    },
  );
  if (captureError) {
    console.error("booking_contact.capture_failed", { code: captureError.code });
    return json(503, { error: { code: "STORAGE_UNAVAILABLE" } });
  }

  return json(201, { ok: true });
});
