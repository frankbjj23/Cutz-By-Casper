import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_display, price_from, note, deposit_amount")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ services: data ?? [] });
}
