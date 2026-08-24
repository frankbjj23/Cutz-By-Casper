import { createHash, randomBytes } from "node:crypto";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 8;
const salt = randomBytes(32);
const attempts = new Map<string, { count: number; resetAt: number }>();

export function getRequestNetworkAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwarded ||
    "unknown"
  );
}

export function consumeBookingContactRateLimit(request: Request) {
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (value.resetAt <= now) attempts.delete(key);
  }

  const fingerprint = createHash("sha256")
    .update(salt)
    .update(getRequestNetworkAddress(request))
    .digest("hex");
  const current = attempts.get(fingerprint);
  if (!current || current.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    attempts.set(fingerprint, { count: 1, resetAt });
    return { allowed: true, resetAt };
  }

  if (current.count >= MAX_REQUESTS) {
    return { allowed: false, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, resetAt: current.resetAt };
}
