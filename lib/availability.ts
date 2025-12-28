import { DateTime } from "luxon";
import { buildLocalDateTime } from "./time";

export type WorkingHours = Record<string, { start: string; end: string }[]>;

export type BusyAppointment = {
  start_time_utc: string;
  end_time_utc: string;
};

export const generateSlots = ({
  date,
  timeZone,
  workingHours,
  serviceDurationMinutes,
  bufferMinutes,
  appointments,
}: {
  date: string;
  timeZone: string;
  workingHours: WorkingHours;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  appointments: BusyAppointment[];
}) => {
  const dayKey = DateTime.fromISO(date, { zone: timeZone }).toFormat("cccc");
  const ranges = workingHours[dayKey] ?? [];
  const slots: { startTimeLocalISO: string; label: string }[] = [];
  const nowLocal = DateTime.now().setZone(timeZone);

  const busyWindows = appointments.map((appt) => {
    const start = DateTime.fromISO(appt.start_time_utc, { zone: "utc" });
    const end = DateTime.fromISO(appt.end_time_utc, { zone: "utc" }).plus({
      minutes: bufferMinutes,
    });
    return { start, end };
  });

  ranges.forEach((range) => {
    const rangeStart = buildLocalDateTime(date, range.start, timeZone);
    const rangeEnd = buildLocalDateTime(date, range.end, timeZone);
    let cursor = rangeStart;

    while (cursor.plus({ minutes: serviceDurationMinutes }) <= rangeEnd) {
      const localStart = cursor;
      const localEnd = cursor.plus({ minutes: serviceDurationMinutes });
      const localEndWithBuffer = localEnd.plus({ minutes: bufferMinutes });
      const utcStart = localStart.toUTC();
      const utcEnd = localEndWithBuffer.toUTC();
      const overlaps = busyWindows.some(
        (window) => utcStart < window.end && utcEnd > window.start
      );
      const isFuture = localStart >= nowLocal;
      if (!overlaps && isFuture) {
        slots.push({
          startTimeLocalISO: localStart.toISO() ?? "",
          label: localStart.toFormat("h:mm a"),
        });
      }
      cursor = cursor.plus({ minutes: 15 });
    }
  });

  return slots;
};
