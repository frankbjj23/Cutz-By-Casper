import { expect, test } from "@playwright/test";
import {
  isValidReviewSignature,
  signReviewPayload,
} from "@/lib/server/review-signature";

test("review receiver signatures use the shared HMAC contract", () => {
  const secret = "a".repeat(64);
  const input = {
    timestamp: "1700000000",
    requestId: "00000000-0000-4000-8000-000000000000",
    siteOrigin: "https://redeemedbycasper.com",
    clientIp: "203.0.113.10",
    payload: "hello",
  };
  const signature = signReviewPayload(secret, input);

  expect(signature).toBe(
    "435ed87e05af02a721ca33acadbbf2fdfd3ba221347095172c42127efb15a65a",
  );
  expect(
    isValidReviewSignature(secret, input, `v1=${signature}`, 1_700_000_001),
  ).toBe(true);
  expect(
    isValidReviewSignature(
      secret,
      { ...input, payload: `${input.payload}!` },
      `v1=${signature}`,
      1_700_000_001,
    ),
  ).toBe(false);
  expect(
    isValidReviewSignature(secret, input, `v1=${signature}`, 1_700_000_601),
  ).toBe(false);
});
