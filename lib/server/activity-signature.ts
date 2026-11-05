import { createHmac } from "node:crypto";

export function activitySignature(secret: string, timestamp: string, payload: string) {
  return createHmac("sha256", secret).update(`redeemed-traffic-v1\n${timestamp}\n${payload}`).digest("hex");
}

export function activityHash(secret: string, kind: "session" | "network", day: string, value: string) {
  return createHmac("sha256", secret).update(`redeemed-traffic-v1:${kind}:${day}:${value}`).digest("hex");
}
