import { describe, expect, it } from "vitest";
import { generateSlots } from "../lib/availability";

const workingHours = {
  Monday: [{ start: "09:00", end: "12:00" }],
};

describe("generateSlots", () => {
  it("excludes overlapping appointments", () => {
    const slots = generateSlots({
      date: "2099-01-06",
      timeZone: "America/New_York",
      workingHours,
      serviceDurationMinutes: 60,
      bufferMinutes: 0,
      appointments: [
        {
          start_time_utc: "2099-01-06T15:00:00Z",
          end_time_utc: "2099-01-06T16:00:00Z",
        },
      ],
    });

    const labels = slots.map((slot) => slot.label);
    expect(labels).toContain("9:00 AM");
    expect(labels).not.toContain("10:00 AM");
    expect(labels).toContain("11:00 AM");
  });
});
