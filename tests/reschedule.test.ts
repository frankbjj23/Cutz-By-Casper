import { describe, expect, it } from "vitest";
import { isRescheduleAllowed } from "../lib/rules";

const now = "2025-01-01T12:00:00Z";

describe("isRescheduleAllowed", () => {
  it("allows reschedule before deadline", () => {
    expect(isRescheduleAllowed("2025-01-02T12:00:00Z", now)).toBe(true);
  });

  it("blocks reschedule after deadline", () => {
    expect(isRescheduleAllowed("2025-01-01T10:00:00Z", now)).toBe(false);
  });
});
