import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/server/appointments";
import { formatLocal } from "@/lib/time";
import { isRescheduleAllowed } from "@/lib/rules";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseClient();
  const settings = await fetchSettings();

  const { data: appointment, error } = await (supabase as any)
    .from("appointments")
    .select(
      "id, service_id, start_time_utc, reschedule_deadline_utc, services(name)"
    )
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const rescheduleAllowed = isRescheduleAllowed(appointment.reschedule_deadline_utc);

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      service_id: appointment.service_id,
      service_name: appointment.services?.name ?? "Service",
      start_time_local: formatLocal(appointment.start_time_utc, settings.time_zone),
      reschedule_allowed: rescheduleAllowed,
    },
  });
}
