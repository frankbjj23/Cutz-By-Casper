import { expect, test } from "@playwright/test";
import { ACTIVITY_SESSION_MS, activityRange, activitySession, easternDay, isActivityPath } from "@/lib/site-activity";
import { activityHash, activitySignature } from "@/lib/server/activity-signature";
import { buildReviewSignatureInput } from "@/lib/server/review-signature";

const id = "11111111-1111-4111-8111-111111111111";
test("Eastern calendar dates respect DST and midnight", () => {
  expect(easternDay(new Date("2026-11-05T04:59:59Z"))).toBe("2026-11-04");
  expect(easternDay(new Date("2026-11-05T05:00:00Z"))).toBe("2026-11-05");
  expect(easternDay(new Date("2026-07-05T04:00:00Z"))).toBe("2026-07-05");
});
test("only aggregate public paths and supported ranges are accepted", () => {
  for (const path of ["/admin", "/admin/login", "/preview", "/auth/confirm", "/book?email=private@example.com", "https://outside.test", null]) {
    expect(isActivityPath(path)).toBe(false);
  }
  expect(isActivityPath("/book")).toBe(true);
  expect(activityRange("7")).toBe(7);
  expect(activityRange("90")).toBe(90);
  expect(activityRange("100000")).toBe(30);
});
test("session reuse prevents refresh inflation and expires after 30 minutes", () => {
  const now = Date.parse("2026-11-05T19:00:00Z");
  const original = activitySession(null, now, () => id);
  original.paths.push("/book");
  const reused = activitySession(JSON.stringify(original), now + 1000, () => "unused");
  expect(reused.id).toBe(id);
  expect(reused.paths).toEqual(["/book"]);
  const expired = activitySession(JSON.stringify(original), now + ACTIVITY_SESSION_MS, () => "replacement");
  expect(expired.id).toBe("replacement");
  expect(expired.paths).toEqual([]);
  expect(activitySession("broken-json", now, () => id).id).toBe(id);
});
test("sessions restart on a new Eastern day and reject corrupt storage", () => {
  const earlier = Date.parse("2026-11-05T04:59:00Z");
  const original = activitySession(null, earlier, () => id);
  expect(activitySession(JSON.stringify(original), earlier + 60000, () => "new-day").id).toBe("new-day");
  expect(activitySession(JSON.stringify({ ...original, paths: ["/admin"] }), earlier, () => "clean").id).toBe("clean");
});
test("analytics identifiers rotate daily and signatures cannot authenticate review requests", () => {
  const secret = "a".repeat(64);
  const hash = activityHash(secret, "session", "2026-11-05", id);
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(hash).not.toBe(activityHash(secret, "session", "2026-11-06", id));
  expect(hash).not.toBe(activityHash(secret, "network", "2026-11-05", id));
  expect(activitySignature(secret, "1700000000", "payload")).not.toBe(activitySignature(secret, "1700000000", "changed"));
  expect(buildReviewSignatureInput({ timestamp: "1700000000", requestId: id, siteOrigin: "https://redeemedbycasper.com", clientIp: "test", payload: "payload" })).not.toBe("redeemed-traffic-v1\n1700000000\npayload");
});
test("activity API enforces origin, privacy choices, body size, and path allowlist", async ({ request }) => {
  const headers = { origin: "https://redeemedbycasper.com", "content-type": "application/json" };
  expect((await request.post("/api/site-activity", { headers: { ...headers, origin: "https://outside.test" }, data: {} })).status()).toBe(403);
  expect((await request.post("/api/site-activity", { headers: { ...headers, dnt: "1" }, data: {} })).status()).toBe(204);
  expect((await request.post("/api/site-activity", { headers: { ...headers, "sec-gpc": "1" }, data: {} })).status()).toBe(204);
  expect((await request.post("/api/site-activity", { headers, data: { sessionId: id, path: "/admin" } })).status()).toBe(400);
  expect((await request.post("/api/site-activity", { headers, data: { sessionId: "invalid", path: "/" } })).status()).toBe(400);
  expect((await request.post("/api/site-activity", { headers, data: { junk: "x".repeat(1100) } })).status()).toBe(413);
  expect((await request.post("/api/site-activity", { headers, data: { sessionId: id, path: "/" } })).status()).toBe(503);
});
