import { describe, expect, it } from "vitest";
import { isWebhookDuplicate } from "@/lib/webhook-utils";

describe("isWebhookDuplicate", () => {
  it("returns true when payment exists and appointment already booked", () => {
    expect(
      isWebhookDuplicate({ paymentExists: true, appointmentStatus: "booked" })
    ).toBe(true);
  });

  it("returns false when payment does not exist", () => {
    expect(
      isWebhookDuplicate({ paymentExists: false, appointmentStatus: "booked" })
    ).toBe(false);
  });

  it("returns false when appointment is not booked yet", () => {
    expect(
      isWebhookDuplicate({ paymentExists: true, appointmentStatus: "pending_payment" })
    ).toBe(false);
  });
});
