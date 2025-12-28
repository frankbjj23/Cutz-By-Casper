import { getRouteHandlerClient } from "../supabase-server";
import { NextResponse } from "next/server";

export const requireAdmin = async () => {
  const supabase = getRouteHandlerClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { supabase };
};
