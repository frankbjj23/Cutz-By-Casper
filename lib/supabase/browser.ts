"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getBookingSupabaseConfig } from "@/lib/supabase/config";

export function createBookingBrowserClient() {
  const config = getBookingSupabaseConfig();
  if (!config) {
    return null;
  }

  return createBrowserClient(config.url, config.publishableKey);
}
