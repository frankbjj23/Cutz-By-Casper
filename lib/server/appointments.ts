import { getSupabaseClient } from "../supabase/client";
import { DEFAULT_TIME_ZONE } from "../time";

export const fetchSettings = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      time_zone: DEFAULT_TIME_ZONE,
      late_grace_minutes: 15,
      reschedule_min_hours: 72,
      deposit_amount_default: 20,
      buffer_minutes: 0,
      working_hours_json: {},
      address: null,
      phone: null,
      policy_text: null,
    };
  }
  return data;
};

export const fetchService = async (serviceId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();
  if (error) throw error;
  return data;
};

export const fetchAppointmentBySession = async (sessionId: string) => {
  const supabase = getSupabaseClient();
  const payment = await supabase
    .from("payments")
    .select("appointment_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (!payment.data) return null;
  const appointment = await supabase
    .from("appointments")
    .select("id, service_id, start_time_utc")
    .eq("id", payment.data.appointment_id)
    .maybeSingle();
  return appointment.data ?? null;
};
