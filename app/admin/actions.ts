"use server";

import { redirect } from "next/navigation";
import { createBookingServerClient } from "@/lib/supabase/server";

function readCredential(
  formData: FormData,
  field: "email" | "password" | "confirmPassword",
) {
  const value = formData.get(field);
  if (typeof value !== "string") {
    return "";
  }
  return field === "email" ? value.trim() : value;
}

export async function completeBookingStaffInvite(formData: FormData) {
  const password = readCredential(formData, "password");
  const confirmPassword = readCredential(formData, "confirmPassword");

  if (
    password.length < 12 ||
    password.length > 72 ||
    password !== confirmPassword
  ) {
    redirect("/admin/accept-invite?error=password");
  }

  const supabase = await createBookingServerClient();
  if (!supabase) {
    redirect("/admin/accept-invite?error=not-configured");
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    redirect("/admin/login?error=invite-invalid");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (staffError || !staff) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not-authorized");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    redirect("/admin/accept-invite?error=update");
  }

  redirect("/admin?welcome=1");
}

export async function signInBookingStaff(formData: FormData) {
  const email = readCredential(formData, "email").toLowerCase();
  const password = readCredential(formData, "password");

  if (!email || !password || email.length > 320 || password.length > 256) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = await createBookingServerClient();
  if (!supabase) {
    redirect("/admin/login?error=not-configured");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    redirect("/admin/login?error=invalid");
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=invalid");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (staffError || !staff) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not-authorized");
  }

  redirect("/admin");
}

export async function signOutBookingStaff() {
  const supabase = await createBookingServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
