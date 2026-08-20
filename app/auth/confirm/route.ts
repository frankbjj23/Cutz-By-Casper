import { NextResponse } from "next/server";
import { createBookingServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash")?.trim();
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || tokenHash.length > 512 || type !== "invite") {
    return NextResponse.redirect(
      new URL("/admin/login?error=invite-invalid", requestUrl),
    );
  }

  const supabase = await createBookingServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/admin/login?error=not-configured", requestUrl),
    );
  }

  const { error: verificationError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  });
  if (verificationError) {
    return NextResponse.redirect(
      new URL("/admin/login?error=invite-invalid", requestUrl),
    );
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/admin/login?error=invite-invalid", requestUrl),
    );
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (staffError || !staff) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/admin/login?error=not-authorized", requestUrl),
    );
  }

  return NextResponse.redirect(new URL("/admin/accept-invite", requestUrl));
}
