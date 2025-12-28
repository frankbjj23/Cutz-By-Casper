import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { statusSchema } from "@/lib/validators";
import { sendSms } from "@/lib/server/sms";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { status } = parsed.data;

  const { data: appointment, error: apptError } = await auth.supabase
    .from("appointments")
    .update({ status })
    .eq("id", params.id)
    .select("id, customers(phone_e164, sms_opt_in)")
    .single();

  if (apptError) {
    return NextResponse.json({ error: apptError.message }, { status: 500 });
  }

  if (status === "no_show") {
    await auth.supabase
      .from("payments")
      .update({ status: "forfeited" })
      .eq("appointment_id", params.id);

    if (appointment.customers?.sms_opt_in) {
      await sendSms({
        appointmentId: params.id,
        customerId: null,
        to: appointment.customers.phone_e164,
        type: "no_show_notice",
        body:
          "Cutz By Casper: Your appointment was marked as no-show. Deposit has been forfeited. Reply STOP to opt out.",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
