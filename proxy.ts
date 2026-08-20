import type { NextRequest } from "next/server";
import { updateBookingSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateBookingSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};

