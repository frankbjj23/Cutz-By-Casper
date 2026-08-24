import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInBookingStaff } from "@/app/admin/actions";
import { getBookingStaff } from "@/lib/server/booking-auth";
import { getBookingSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Private Booking Sign In",
  robots: { index: false, follow: false, nocache: true },
};

const messages: Record<string, string> = {
  invalid: "That email and password could not be verified.",
  "not-authorized": "This account is not approved for the private booking room.",
  "not-configured": "The private booking room has not been connected yet.",
  "invite-invalid":
    "That old email link cannot be used. Request a new owner code instead.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await getBookingStaff();
  if (staff) {
    redirect("/admin");
  }

  const { error } = await searchParams;
  const message = error ? messages[error] : null;
  const configured = Boolean(getBookingSupabaseConfig());

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[75vh] max-w-6xl items-center px-5 py-16 sm:px-8"
    >
      <section className="mx-auto w-full max-w-lg border border-gold/30 bg-[#121214] p-7 shadow-2xl sm:p-10">
        <p className="eyebrow">Private booking room</p>
        <h1 className="mt-5 font-display text-4xl text-pearl sm:text-5xl">
          Casper&apos;s sign in
        </h1>
        <p className="mt-5 text-sm leading-7 text-pearl/65">
          This area is for approved Redeemed booking staff only. Customer booking
          remains on Booksy while the new system is tested privately.
        </p>

        {!configured ? (
          <div className="mt-8 border border-gold/30 bg-gold/5 p-5 text-sm leading-7 text-pearl/75">
            The secure database connection has not been added to this environment.
            No sign-in or appointment data is active here yet.
          </div>
        ) : (
          <form action={signInBookingStaff} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/75"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="mt-3 w-full border border-pearl/20 bg-black px-4 py-3 text-base text-pearl outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/75"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-3 w-full border border-pearl/20 bg-black px-4 py-3 text-base text-pearl outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
            {message ? (
              <p role="alert" className="border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100">
                {message}
              </p>
            ) : null}
            <button type="submit" className="primary-button w-full">
              Enter private calendar
            </button>
          </form>
        )}

        {configured ? (
          <Link
            href="/admin/owner-access"
            className="mt-8 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-gold underline decoration-gold underline-offset-8"
          >
            Create or reset the owner password
          </Link>
        ) : null}

        <Link
          href="/"
          className="mt-8 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-pearl/65 underline decoration-gold underline-offset-8"
        >
          Return to the public site
        </Link>
      </section>
    </main>
  );
}
