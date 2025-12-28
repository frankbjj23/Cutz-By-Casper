import { DateTime } from "luxon";

export const DEFAULT_TIME_ZONE = "America/New_York";

export const toUtcISO = (localISO: string, timeZone: string) => {
  return DateTime.fromISO(localISO, { zone: timeZone }).toUTC().toISO();
};

export const formatLocal = (utcISO: string, timeZone: string) => {
  return DateTime.fromISO(utcISO, { zone: "utc" })
    .setZone(timeZone)
    .toFormat("ccc, LLL d - h:mm a");
};

export const toLocalISO = (utcISO: string, timeZone: string) => {
  return DateTime.fromISO(utcISO, { zone: "utc" })
    .setZone(timeZone)
    .toISO();
};

export const getDayOfWeekKey = (localISODate: string, timeZone: string) => {
  return DateTime.fromISO(localISODate, { zone: timeZone }).toFormat("cccc");
};

export const buildLocalDateTime = (
  localDate: string,
  time: string,
  timeZone: string
) => {
  return DateTime.fromISO(`${localDate}T${time}`, { zone: timeZone });
};
