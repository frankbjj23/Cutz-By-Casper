export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      services: {
        Row: {
          id: string;
          name: string;
          duration_minutes: number;
          price_display: string;
          price_cents: number;
          price_from: boolean;
          note: string | null;
          deposit_amount: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          duration_minutes: number;
          price_display: string;
          price_cents?: number;
          price_from?: boolean;
          note?: string | null;
          deposit_amount?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
      };
      business_settings: {
        Row: {
          id: string;
          time_zone: string;
          late_grace_minutes: number;
          reschedule_min_hours: number;
          deposit_amount_default: number;
          buffer_minutes: number;
          working_hours_json: Json;
          address: string | null;
          phone: string | null;
          policy_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          time_zone: string;
          late_grace_minutes?: number;
          reschedule_min_hours?: number;
          deposit_amount_default?: number;
          buffer_minutes?: number;
          working_hours_json: Json;
          address?: string | null;
          phone?: string | null;
          policy_text?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["business_settings"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          full_name: string;
          phone_e164: string;
          sms_opt_in: boolean;
          created_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone_e164: string;
          sms_opt_in?: boolean;
          created_at?: string;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          customer_id: string;
          service_id: string;
          start_time_utc: string;
          end_time_utc: string;
          status:
            | "pending_payment"
            | "booked"
            | "completed"
            | "cancelled"
            | "no_show"
            | "expired";
          hold_expires_at_utc: string | null;
          late_eligible_at_utc: string;
          reschedule_deadline_utc: string;
          rescheduled_from_appointment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          service_id: string;
          start_time_utc: string;
          end_time_utc: string;
          status?: Database["public"]["Tables"]["appointments"]["Row"]["status"];
          hold_expires_at_utc?: string | null;
          late_eligible_at_utc: string;
          reschedule_deadline_utc: string;
          rescheduled_from_appointment_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          appointment_id: string;
          stripe_checkout_session_id: string;
          amount_cents: number;
          currency: string;
          status: "paid" | "refunded" | "forfeited";
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          stripe_checkout_session_id: string;
          amount_cents: number;
          currency: string;
          status?: "paid" | "refunded" | "forfeited";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      sms_logs: {
        Row: {
          id: string;
          appointment_id: string | null;
          customer_id: string | null;
          type:
            | "confirmation"
            | "reminder_24h"
            | "reminder_2h"
            | "late_warning"
            | "no_show_notice";
          to_phone: string;
          twilio_sid: string | null;
          status: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          appointment_id?: string | null;
          customer_id?: string | null;
          type:
            | "confirmation"
            | "reminder_24h"
            | "reminder_2h"
            | "late_warning"
            | "no_show_notice";
          to_phone: string;
          twilio_sid?: string | null;
          status?: string;
          sent_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sms_logs"]["Insert"]>;
      };
      time_blocks: {
        Row: {
          id: string;
          start_time_utc: string;
          end_time_utc: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          start_time_utc: string;
          end_time_utc: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["time_blocks"]["Insert"]>;
      };
    };
  };
};
