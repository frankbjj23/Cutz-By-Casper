export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { requireAdmin } from "@/lib/server/auth";
import { fetchSettings } from "@/lib/server/appointments";
import { formatLocal } from "@/lib/time";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  const settings = await fetchSettings();
  const localStart = DateTime.fromISO(date, { zone: settings.time_zone }).startOf("day");
  const localEnd = localStart.endOf("day");

  const dayStartUtc = localStart.toUTC().toISO();
  const dayEndUtc = localEnd.toUTC().toISO();

  const { data, error } = await (auth.supabase as any)
    .from("appointments")
    .select(
      "id, start_time_utc, end_time_utc, status, late_eligible_at_utc, services(name), customers(full_name)"
    )
    .lt("start_time_utc", dayEndUtc)
    .gt("end_time_utc", dayStartUtc)
    .order("start_time_utc", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nowUtc = DateTime.utc().toISO();
  const appointments = (data ?? []).map((appt: any) => ({
    id: appt.id,
    start_time_local: formatLocal(appt.start_time_utc, settings.time_zone),
    end_time_local: formatLocal(appt.end_time_utc, settings.time_zone),
    service_name: appt.services?.name ?? "Service",
    customer_name: appt.customers?.full_name ?? "Client",
    status: appt.status,
    late_eligible: appt.status === "booked" && appt.late_eligible_at_utc <= nowUtc,
  }));

  return NextResponse.json({ appointments });
}
