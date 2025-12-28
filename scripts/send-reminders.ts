import { DateTime } from "luxon";
import { getSupabaseAdmin } from "../lib/supabase/admin";
import { fetchSettings } from "../lib/server/appointments";
import { formatLocal } from "../lib/time";
import { sendSms } from "../lib/server/sms";
import { DEMO_MODE, HAS_TWILIO } from "../lib/env";

const getWindow = (hoursFromNow: number, minutesBuffer = 5) => {
  const start = DateTime.utc().plus({ hours: hoursFromNow, minutes: -minutesBuffer });
  const end = DateTime.utc().plus({ hours: hoursFromNow, minutes: minutesBuffer });
  return { start: start.toISO(), end: end.toISO() };
};

const main = async () => {
  const supabase = getSupabaseAdmin() as any;
  const settings = await fetchSettings();

  if (DEMO_MODE || !HAS_TWILIO) {
    console.log("Demo mode or missing Twilio env vars. Skipping reminders.");
    return;
  }

  const windows = [
    { type: "reminder_24h" as const, ...getWindow(24) },
    { type: "reminder_2h" as const, ...getWindow(2) },
  ];

  for (const window of windows) {
    const { data } = await supabase
      .from("appointments")
      .select("id, start_time_utc, customers(phone_e164, sms_opt_in)")
      .eq("status", "booked")
      .gte("start_time_utc", window.start)
      .lte("start_time_utc", window.end);

    for (const appt of data ?? []) {
      if (!appt.customers?.sms_opt_in) continue;
      const localLabel = formatLocal(appt.start_time_utc, settings.time_zone);
      await sendSms({
        appointmentId: appt.id,
        to: appt.customers.phone_e164,
        type: window.type,
        body: `Cutz By Casper: Reminder for your appointment on ${localLabel}. Reply STOP to opt out.`,
      });
    }
  }

  const lateWindowStart = DateTime.utc().minus({ minutes: 15 }).toISO();
  const lateWindowEnd = DateTime.utc().minus({ minutes: 9 }).toISO();
  const { data: lateAppointments } = await supabase
    .from("appointments")
    .select("id, start_time_utc, customers(phone_e164, sms_opt_in)")
    .eq("status", "booked")
    .gte("start_time_utc", lateWindowStart)
    .lte("start_time_utc", lateWindowEnd);

  for (const appt of lateAppointments ?? []) {
    if (!appt.customers?.sms_opt_in) continue;
    await sendSms({
      appointmentId: appt.id,
      to: appt.customers.phone_e164,
      type: "late_warning",
      body: "Cutz By Casper: You are 10 minutes into your appointment window. Please arrive soon. Reply STOP to opt out.",
    });
  }

  console.log("Reminder scan complete.");
};

main();
