export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { settingsSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { data, error } = await (auth.supabase as any)
    .from("business_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  const { data: existing } = await (auth.supabase as any)
    .from("business_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const targetId = parsed.data.id ?? existing?.id;
  if (!targetId) {
    return NextResponse.json({ error: "Settings row not found" }, { status: 404 });
  }

  const { id: parsedId, ...updateData } = parsed.data;
  const { error } = await (auth.supabase as any)
    .from("business_settings")
    .update(updateData)
    .eq("id", targetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
