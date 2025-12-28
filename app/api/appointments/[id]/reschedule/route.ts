import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { rescheduleSchema } from "@/lib/validators";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/server/appointments";
import { sendSms } from "@/lib/server/sms";
import { formatLocal } from "@/lib/time";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const parsed = rescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const settings = await fetchSettings();

  const appointment = await (supabase as any)
    .from("appointments")
    .select("id, service_id, start_time_utc, reschedule_deadline_utc, customers(full_name, phone_e164, sms_opt_in)")
    .eq("id", params.id)
    .single();

  if (appointment.error) {
    return NextResponse.json({ error: appointment.error.message }, { status: 404 });
  }

  if (appointment.data.reschedule_deadline_utc < DateTime.utc().toISO()) {
    return NextResponse.json({ error: "Reschedule window closed." }, { status: 400 });
  }

  const service = await (supabase as any)
    .from("services")
    .select("duration_minutes")
    .eq("id", appointment.data.service_id)
    .single();
  if (service.error) {
    return NextResponse.json({ error: service.error.message }, { status: 500 });
  }

  const startLocal = DateTime.fromISO(parsed.data.startTimeLocalISO, {
    zone: settings.time_zone,
  });
  if (!startLocal.isValid) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }
  if (startLocal <= DateTime.now().setZone(settings.time_zone)) {
    return NextResponse.json({ error: "Start time is in the past" }, { status: 400 });
  }
  const startUtc = startLocal.toUTC();
  const endUtc = startUtc.plus({ minutes: service.data.duration_minutes });
  const lateEligibleAt = startUtc.plus({ minutes: settings.late_grace_minutes });
  const rescheduleDeadline = startUtc.minus({ hours: settings.reschedule_min_hours });

  const { error } = await (supabase as any).rpc("reschedule_appointment", {
    p_appointment_id: params.id,
    p_start_time_utc: startUtc.toISO(),
    p_end_time_utc: endUtc.toISO(),
    p_late_eligible_at_utc: lateEligibleAt.toISO(),
    p_reschedule_deadline_utc: rescheduleDeadline.toISO(),
    p_buffer_minutes: settings.buffer_minutes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  if (appointment.data.customers?.sms_opt_in) {
    const localLabel = formatLocal(startUtc.toISO() ?? "", settings.time_zone);
    await sendSms({
      appointmentId: params.id,
      to: appointment.data.customers.phone_e164,
      type: "confirmation",
      body: `Cutz By Casper: Your appointment has been rescheduled to ${localLabel}. Reply STOP to opt out.`,
      allowDuplicate: true,
    });
  }

  return NextResponse.json({ ok: true });
}
