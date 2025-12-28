import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { requireAdmin } from "@/lib/server/auth";
import { fetchSettings } from "@/lib/server/appointments";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { date, startTime, endTime, note } = body ?? {};
  if (!date || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing block fields" }, { status: 400 });
  }

  const settings = await fetchSettings();
  const startLocal = DateTime.fromISO(`${date}T${startTime}`, {
    zone: settings.time_zone,
  });
  const endLocal = DateTime.fromISO(`${date}T${endTime}`, {
    zone: settings.time_zone,
  });
  if (!startLocal.isValid || !endLocal.isValid || startLocal >= endLocal) {
    return NextResponse.json({ error: "Invalid block window" }, { status: 400 });
  }

  const { error } = await (auth.supabase as any).from("time_blocks").insert({
    start_time_utc: startLocal.toUTC().toISO(),
    end_time_utc: endLocal.toUTC().toISO(),
    note: note ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
