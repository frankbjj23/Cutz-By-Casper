import { NextResponse } from "next/server";
import { DEMO_MODE, HAS_STRIPE, HAS_TWILIO } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    demo: DEMO_MODE || !HAS_STRIPE || !HAS_TWILIO,
    hasStripe: HAS_STRIPE,
    hasTwilio: HAS_TWILIO,
  });
}
