import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getSupabaseAdmin = () => {
  if (!url || !service) {
    throw new Error(
      "Missing Supabase server env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and restart."
    );
  }

  return createClient<Database>(url, service, {
    auth: { persistSession: false },
  });
};
