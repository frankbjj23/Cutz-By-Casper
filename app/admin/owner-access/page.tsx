import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import OwnerEmailCode from "@/components/OwnerEmailCode";
import { getBookingStaff } from "@/lib/server/booking-auth";
import { getBookingSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Owner Access Code",
  robots: { index: false, follow: false, nocache: true },
};

export default async function OwnerAccessPage() {
  const staff = await getBookingStaff();
  if (staff) {
    redirect("/admin/accept-invite");
  }

  const configured = Boolean(getBookingSupabaseConfig());

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[75vh] max-w-6xl items-center px-5 py-16 sm:px-8"
    >
      <section className="mx-auto w-full max-w-lg border border-gold/30 bg-[#121214] p-7 shadow-2xl sm:p-10">
        <p className="eyebrow">Secure owner access</p>
        <h1 className="mt-5 font-display text-4xl text-pearl sm:text-5xl">
          Use a code, not an email link
        </h1>
        <p className="mt-5 text-sm leading-7 text-pearl/65">
          We will email a six-digit code. Type it here to create or reset the
          private booking password. Opening the email cannot use the code for you.
        </p>

        {!configured ? (
          <div className="mt-8 border border-gold/30 bg-gold/5 p-5 text-sm leading-7 text-pearl/75">
            The secure database connection has not been added to this environment.
            No owner code can be requested here yet.
          </div>
        ) : (
          <OwnerEmailCode />
        )}

        <Link
          href="/admin/login"
          className="mt-8 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-pearl/65 underline decoration-gold underline-offset-8"
        >
          Return to staff sign in
        </Link>
      </section>
    </main>
  );
}
