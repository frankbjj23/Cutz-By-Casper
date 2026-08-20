import "server-only";

import { redirect } from "next/navigation";
import { createBookingServerClient } from "@/lib/supabase/server";

type BookingStaff = {
  userId: string;
  email: string | null;
  role: "owner" | "administrator";
};

export async function getBookingStaff(): Promise<BookingStaff | null> {
  const supabase = await createBookingServerClient();
  if (!supabase) {
    return null;
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    return null;
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("role, active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (staffError || !staff) {
    return null;
  }

  return {
    userId,
    email:
      typeof claimsData.claims.email === "string" ? claimsData.claims.email : null,
    role: staff.role as BookingStaff["role"],
  };
}

export async function requireBookingStaff() {
  const staff = await getBookingStaff();
  if (!staff) {
    redirect("/admin/login");
  }
  return staff;
}

