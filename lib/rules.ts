import { DateTime } from "luxon";

export const isRescheduleAllowed = (rescheduleDeadlineUtc: string, nowUtc?: string) => {
  const now = nowUtc ? DateTime.fromISO(nowUtc, { zone: "utc" }) : DateTime.utc();
  return DateTime.fromISO(rescheduleDeadlineUtc, { zone: "utc" }) >= now;
};
