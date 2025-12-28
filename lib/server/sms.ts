import { getTwilioClient } from "../twilio";
import { supabaseAdmin } from "../supabase/admin";

export const sendSms = async ({
  appointmentId,
  customerId,
  to,
  type,
  body,
  allowDuplicate,
}: {
  appointmentId?: string;
  customerId?: string;
  to: string;
  type:
    | "confirmation"
    | "reminder_24h"
    | "reminder_2h"
    | "late_warning"
    | "no_show_notice";
  body: string;
  allowDuplicate?: boolean;
}) => {
  const supabase = supabaseAdmin;
  if (!allowDuplicate) {
    const existing = await supabase
      .from("sms_logs")
      .select("id")
      .match({ appointment_id: appointmentId ?? null, type })
      .limit(1)
      .maybeSingle();

    if (existing.data) {
      return { skipped: true };
    }
  }

  const client = getTwilioClient();
  let twilioSid: string | null = null;
  let status = "queued";

  if (client) {
    const message = await client.messages.create({
      body,
      to,
      from: process.env.TWILIO_FROM_NUMBER ?? "",
    });
    twilioSid = message.sid;
    status = message.status ?? "sent";
  } else {
    status = "skipped_no_client";
  }

  await supabase.from("sms_logs").insert({
    appointment_id: appointmentId ?? null,
    customer_id: customerId ?? null,
    type,
    to_phone: to,
    twilio_sid: twilioSid,
    status,
  });

  return { skipped: false };
};
