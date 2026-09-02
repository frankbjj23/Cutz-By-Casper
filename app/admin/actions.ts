"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBookingStaff } from "@/lib/server/booking-auth";
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

function readReviewId(formData: FormData) {
  const value = formData.get("reviewId");
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    redirect("/admin?review=invalid#review-moderation");
  }
  return value;
}

export async function approveReviewSubmission(formData: FormData) {
  const reviewId = readReviewId(formData);
  await requireBookingStaff();
  const supabase = await createBookingServerClient();
  if (!supabase) redirect("/admin/login");

  const { error } = await supabase.rpc("publish_review_submission", {
    p_submission_id: reviewId,
  });
  if (error) {
    console.error("review.approval_failed", { code: error.code });
    redirect("/admin?review=approve-error#review-moderation");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?review=approved#review-moderation");
}

export async function rejectReviewSubmission(formData: FormData) {
  const reviewId = readReviewId(formData);
  const staff = await requireBookingStaff();
  const supabase = await createBookingServerClient();
  if (!supabase) redirect("/admin/login");

  const { data, error } = await supabase
    .from("review_submissions")
    .update({
      status: "rejected",
      moderated_at: new Date().toISOString(),
      moderated_by: staff.userId,
    })
    .eq("id", reviewId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("review.rejection_failed", { code: error?.code ?? "not-found" });
    redirect("/admin?review=reject-error#review-moderation");
  }

  revalidatePath("/admin");
  redirect("/admin?review=rejected#review-moderation");
}

export async function setPublishedReviewVisibility(formData: FormData) {
  const reviewId = readReviewId(formData);
  await requireBookingStaff();
  const supabase = await createBookingServerClient();
  if (!supabase) redirect("/admin/login");

  const active = formData.get("active") === "true";
  const { data, error } = await supabase
    .from("published_reviews")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", reviewId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("review.visibility_failed", { code: error?.code ?? "not-found" });
    redirect("/admin?review=visibility-error#review-moderation");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?review=visibility-updated#review-moderation");
}

export async function deleteReviewSubmission(formData: FormData) {
  const reviewId = readReviewId(formData);
  await requireBookingStaff();
  const supabase = await createBookingServerClient();
  if (!supabase) redirect("/admin/login");

  const { data, error } = await supabase.rpc("delete_review_submission", {
    p_submission_id: reviewId,
  });
  if (error || data !== true) {
    console.error("review.deletion_failed", { code: error?.code ?? "not-found" });
    redirect("/admin?review=delete-error#review-moderation");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?review=deleted#review-moderation");
}
