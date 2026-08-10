import { createHash, timingSafeEqual } from "node:crypto";

const DEFAULT_ACCESS_HASH =
  "e3ca364bc6c1f2e92f82d7bc4359dc9e43c1a9b1261c9054187b9e163e96c490";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type StylePreviewGlobal = typeof globalThis & {
  __redeemedStylePreviewRateLimits?: Map<string, RateLimitBucket>;
};

const globalStore = globalThis as StylePreviewGlobal;
const rateLimits =
  globalStore.__redeemedStylePreviewRateLimits ??
  (globalStore.__redeemedStylePreviewRateLimits = new Map<string, RateLimitBucket>());

function configuredAccessHash() {
  const candidate = process.env.STYLE_PREVIEW_ACCESS_HASH ?? DEFAULT_ACCESS_HASH;
  return /^[a-f0-9]{64}$/i.test(candidate) ? candidate.toLowerCase() : null;
}

export function hasValidStylePreviewAccess(code: string | null) {
  const expectedHex = configuredAccessHash();
  if (!expectedHex || !code || code.length > 128) {
    return false;
  }

  const actual = createHash("sha256").update(code.trim(), "utf8").digest();
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`style-preview:${address}`).digest("hex");
}

export function consumeStylePreviewRateLimit(
  request: Request,
  kind: "access" | "processing" | "generation",
) {
  const now = Date.now();
  const windowMs = kind === "access" ? 15 * 60 * 1000 : 60 * 60 * 1000;
  const maximum = kind === "access" ? 20 : kind === "processing" ? 10 : 3;
  const key = `${kind}:${requestFingerprint(request)}`;
  const existing = rateLimits.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimits.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maximum - 1, resetAt };
  }

  if (existing.count >= maximum) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: maximum - existing.count, resetAt: existing.resetAt };
}

export function pruneStylePreviewRateLimits() {
  if (rateLimits.size < 500) {
    return;
  }

  const now = Date.now();
  for (const [key, bucket] of rateLimits) {
    if (bucket.resetAt <= now) {
      rateLimits.delete(key);
    }
  }
}
