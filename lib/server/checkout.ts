import { DateTime } from "luxon";
import { checkoutSchema } from "@/lib/validators";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/server/appointments";
import { stripe } from "@/lib/stripe";

export class CheckoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const createCheckoutSession = async (input: unknown) => {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    throw new CheckoutError("Invalid request", 400);
  }

  const supabase = getSupabaseClient();
  const settings = await fetchSettings();
  const { serviceId, startTimeLocalISO, fullName, phoneE164, smsOptIn } = parsed.data;

  const serviceResponse = await supabase
    .from("services")
    .select("id, duration_minutes, deposit_amount, price_from")
    .eq("id", serviceId)
    .eq("active", true)
    .single();
  if (serviceResponse.error) {
    throw new CheckoutError(serviceResponse.error.message, 500);
  }
  if (serviceResponse.data.price_from) {
    throw new CheckoutError(
      "This service requires direct confirmation. Please text Casper.",
      400
    );
  }

  const startLocal = DateTime.fromISO(startTimeLocalISO, { zone: settings.time_zone });
  if (!startLocal.isValid) {
    throw new CheckoutError("Invalid start time", 400);
  }
  if (startLocal <= DateTime.now().setZone(settings.time_zone)) {
    throw new CheckoutError("Start time is in the past", 400);
  }
  const startUtc = startLocal.toUTC();
  const endUtc = startUtc.plus({ minutes: serviceResponse.data.duration_minutes });

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  let customerId = existingCustomer?.id;
  if (!customerId) {
    const created = await supabase
      .from("customers")
      .insert({
        full_name: fullName,
        phone_e164: phoneE164,
        sms_opt_in: smsOptIn,
      })
      .select("id")
      .single();
    if (created.error) {
      throw new CheckoutError(created.error.message, 500);
    }
    customerId = created.data.id;
  } else {
    await supabase
      .from("customers")
      .update({ full_name: fullName, sms_opt_in: smsOptIn })
      .eq("id", customerId);
  }

  const holdExpiresAt = DateTime.utc().plus({ minutes: 10 });
  const lateEligibleAt = startUtc.plus({ minutes: settings.late_grace_minutes });
  const rescheduleDeadline = startUtc.minus({ hours: settings.reschedule_min_hours });

  const { data: appointmentId, error: appointmentError } = await supabase.rpc(
    "create_pending_appointment",
    {
      p_customer_id: customerId,
      p_service_id: serviceId,
      p_start_time_utc: startUtc.toISO(),
      p_end_time_utc: endUtc.toISO(),
      p_hold_expires_at_utc: holdExpiresAt.toISO(),
      p_late_eligible_at_utc: lateEligibleAt.toISO(),
      p_reschedule_deadline_utc: rescheduleDeadline.toISO(),
      p_buffer_minutes: settings.buffer_minutes,
    }
  );

  if (appointmentError) {
    throw new CheckoutError(appointmentError.message, 409);
  }

  const amountCents = Math.round(Number(serviceResponse.data.deposit_amount) * 100);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Cutz By Casper Deposit",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: { appointment_id: appointmentId },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel?appointment_id=${appointmentId}`,
  });

  if (!session.url) {
    throw new CheckoutError("Stripe session missing URL", 500);
  }

  return { checkoutUrl: session.url };
};
