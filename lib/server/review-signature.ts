import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const REVIEW_RECEIVER_PATH = "/functions/v1/capture-review";
export const REVIEW_SIGNATURE_MAX_AGE_SECONDS = 5 * 60;

type ReviewSignatureInput = {
  timestamp: string;
  requestId: string;
  siteOrigin: string;
  clientIp: string;
  payload: string;
};

export function hashReviewPayload(payload: string) {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function buildReviewSignatureInput(input: ReviewSignatureInput) {
  return [
    "redeemed-review-v1",
    "POST",
    REVIEW_RECEIVER_PATH,
    input.timestamp,
    input.requestId,
    input.siteOrigin,
    input.clientIp,
    hashReviewPayload(input.payload),
  ].join("\n");
}

export function signReviewPayload(secret: string, input: ReviewSignatureInput) {
  return createHmac("sha256", secret)
    .update(buildReviewSignatureInput(input), "utf8")
    .digest("hex");
}

export function isValidReviewSignature(
  secret: string,
  input: ReviewSignatureInput,
  suppliedSignature: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (
    !/^[0-9a-f]{64}$/.test(secret) ||
    !/^\d{10,13}$/.test(input.timestamp) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.requestId,
    ) ||
    !/^v1=[0-9a-f]{64}$/.test(suppliedSignature)
  ) {
    return false;
  }

  const timestampSeconds = Number(input.timestamp);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > REVIEW_SIGNATURE_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const expected = Buffer.from(signReviewPayload(secret, input), "hex");
  const supplied = Buffer.from(suppliedSignature.slice(3), "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
