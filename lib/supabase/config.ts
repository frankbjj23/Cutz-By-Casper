export type BookingSupabaseConfig = {
  url: string;
  publishableKey: string;
};

export const CURRENT_BOOKING_SUPABASE_URL =
  "https://wtbcvhcwmbjthcrywuwd.supabase.co";
export const CURRENT_BOOKING_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_6oRcDDxTYi7slj9ZEoQNxA_-TdmPv55";

export function getBookingSupabaseConfig(): BookingSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_BOOKING_SUPABASE_URL?.trim();
  const configuredPublishableKey =
    process.env.NEXT_PUBLIC_BOOKING_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !configuredPublishableKey) {
    return null;
  }

  const publishableKey =
    url.replace(/\/$/, "") === CURRENT_BOOKING_SUPABASE_URL
      ? CURRENT_BOOKING_SUPABASE_PUBLISHABLE_KEY
      : configuredPublishableKey;

  return { url, publishableKey };
}

