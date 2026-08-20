import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getBookingSupabaseConfig } from "@/lib/supabase/config";

export async function createBookingServerClient() {
  const config = getBookingSupabaseConfig();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. The root proxy refreshes the
          // session before protected admin pages are rendered.
        }
      },
    },
  });
}

