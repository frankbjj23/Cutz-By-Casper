import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/server/appointments";
import { formatLocal } from "@/lib/time";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const settings = await fetchSettings();

  const { data: payment } = await supabase
    .from("payments")
    .select("appointment_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!payment?.appointment_id) {
    return NextResponse.json({ appointment: null });
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, start_time_utc, services(name)")
    .eq("id", payment.appointment_id)
    .maybeSingle();

  if (!appointment) {
    return NextResponse.json({ appointment: null });
  }

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      start_time_local: formatLocal(appointment.start_time_utc, settings.time_zone),
      service_name: appointment.services?.name ?? "Service",
    },
  });
}
