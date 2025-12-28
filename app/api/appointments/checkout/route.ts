import { NextResponse } from "next/server";
import { CheckoutError, createCheckoutSession } from "@/lib/server/checkout";
import { DEMO_MODE, HAS_STRIPE } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await createCheckoutSession(body);
    if (result.demo || DEMO_MODE || !HAS_STRIPE) {
      return NextResponse.json({
        replyText:
          "Demo mode: payments are disabled. This is a sample booking request (no charge).",
        demo: true,
        actions: [
          { type: "open_booking", label: "Back to Booking", href: "/book" },
          { type: "call", label: "Call Casper", href: "tel:+12018896440" },
          { type: "text", label: "Text Casper", href: "sms:+12018896440" },
        ],
      });
    }
    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
