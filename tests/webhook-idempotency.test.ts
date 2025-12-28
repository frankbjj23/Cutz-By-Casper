import { describe, expect, it } from "vitest";
import { isWebhookDuplicate } from "../lib/webhook-utils";

describe("isWebhookDuplicate", () => {
  it("flags duplicate when payment exists and appointment booked", () => {
    expect(
      isWebhookDuplicate({ paymentExists: true, appointmentStatus: "booked" })
    ).toBe(true);
  });

  it("allows processing when payment missing", () => {
    expect(
      isWebhookDuplicate({ paymentExists: false, appointmentStatus: "booked" })
    ).toBe(false);
  });

  it("allows processing when appointment not booked", () => {
    expect(
      isWebhookDuplicate({ paymentExists: true, appointmentStatus: "pending_payment" })
    ).toBe(false);
  });
});
