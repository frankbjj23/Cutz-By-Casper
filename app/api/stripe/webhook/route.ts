import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchSettings } from "@/lib/server/appointments";
import { formatLocal } from "@/lib/time";
import { sendSms } from "@/lib/server/sms";
import { isWebhookDuplicate } from "@/lib/webhook-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") ?? "";
  const payload = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const appointmentId = session.metadata?.appointment_id;
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment" }, { status: 400 });
  }

  const supabase = supabaseAdmin;
  const settings = await fetchSettings();

  const existingPayment = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  const appointmentStatus = await supabase
    .from("appointments")
    .select("status")
    .eq("id", appointmentId)
    .maybeSingle();

  if (
    isWebhookDuplicate({
      paymentExists: Boolean(existingPayment.data),
      appointmentStatus: appointmentStatus.data?.status ?? null,
    })
  ) {
    return NextResponse.json({ received: true });
  }

  if (!existingPayment.data) {
    await supabase.from("payments").insert({
      appointment_id: appointmentId,
      stripe_checkout_session_id: session.id,
      amount_cents: session.amount_total ?? 2000,
      currency: session.currency ?? "usd",
      status: "paid",
    });
  }

  await supabase
    .from("appointments")
    .update({ status: "booked" })
    .eq("id", appointmentId);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, start_time_utc, customers(phone_e164, sms_opt_in)")
    .eq("id", appointmentId)
    .single();

  if (appointment?.customers?.sms_opt_in) {
    const localLabel = formatLocal(appointment.start_time_utc, settings.time_zone);
    await sendSms({
      appointmentId: appointment.id,
      customerId: null,
      to: appointment.customers.phone_e164,
      type: "confirmation",
      body: `Cutz By Casper: Your booking is confirmed for ${localLabel}. Reply STOP to opt out.`,
    });
  }

  return NextResponse.json({ received: true });
}
