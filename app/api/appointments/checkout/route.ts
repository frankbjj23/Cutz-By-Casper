import { NextResponse } from "next/server";
import { CheckoutError, createCheckoutSession } from "@/lib/server/checkout";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const { checkoutUrl } = await createCheckoutSession(body);
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
