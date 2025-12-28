import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/server/appointments";
import { generateSlots } from "@/lib/availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date || !serviceId) {
    return NextResponse.json({ error: "Missing date or serviceId" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const settings = await fetchSettings();

  const service = await supabase
    .from("services")
    .select("duration_minutes, price_from")
    .eq("id", serviceId)
    .single();
  if (service.error) {
    return NextResponse.json({ error: service.error.message }, { status: 500 });
  }
  if (service.data.price_from) {
    return NextResponse.json({ slots: [] });
  }

  const localStart = DateTime.fromISO(date, { zone: settings.time_zone }).startOf("day");
  if (!localStart.isValid) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const localEnd = localStart.endOf("day");

  const dayStartUtc = localStart.toUTC().toISO();
  const dayEndUtc = localEnd.toUTC().toISO();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time_utc, end_time_utc, status, hold_expires_at_utc")
    .lt("start_time_utc", dayEndUtc)
    .gt("end_time_utc", dayStartUtc)
    .in("status", ["booked", "pending_payment"]);

  const { data: blocks } = await supabase
    .from("time_blocks")
    .select("start_time_utc, end_time_utc")
    .lt("start_time_utc", dayEndUtc)
    .gt("end_time_utc", dayStartUtc);

  const nowUtc = DateTime.utc().toISO();
  const filtered = (appointments ?? []).filter((appt) => {
    if (appt.status !== "pending_payment") return true;
    return appt.hold_expires_at_utc && appt.hold_expires_at_utc > nowUtc;
  });

  const slots = generateSlots({
    date,
    timeZone: settings.time_zone,
    workingHours: settings.working_hours_json as any,
    serviceDurationMinutes: service.data.duration_minutes,
    bufferMinutes: settings.buffer_minutes,
    appointments: [...filtered, ...(blocks ?? [])],
  });

  return NextResponse.json({ slots });
}
