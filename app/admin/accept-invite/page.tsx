import type { Metadata } from "next";
import Link from "next/link";
import { completeBookingStaffInvite } from "@/app/admin/actions";
import { getBookingStaff } from "@/lib/server/booking-auth";
import { getBookingSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Activate Private Booking Access",
  robots: { index: false, follow: false, nocache: true },
};

const messages: Record<string, string> = {
  password:
    "Use matching passwords between 12 and 72 characters, then try again.",
  update:
    "Your password could not be saved. The invitation may have expired; request a new one.",
  "not-configured": "The private booking room has not been connected yet.",
};

export default async function AcceptBookingInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = Boolean(getBookingSupabaseConfig());
  const { error } = await searchParams;
  const message = error ? messages[error] : null;

  const staff = configured ? await getBookingStaff() : null;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[75vh] max-w-6xl items-center px-5 py-16 sm:px-8"
    >
      <section className="mx-auto w-full max-w-lg border border-gold/30 bg-[#121214] p-7 shadow-2xl sm:p-10">
        <p className="eyebrow">Owner invitation</p>
        <h1 className="mt-5 font-display text-4xl text-pearl sm:text-5xl">
          Set your private password
        </h1>
        <p className="mt-5 text-sm leading-7 text-pearl/65">
          Create the password you will use for Redeemed&apos;s private appointment
          ledger. It must contain at least 12 characters.
        </p>

        {!configured ? (
          <div className="mt-8 border border-gold/30 bg-gold/5 p-5 text-sm leading-7 text-pearl/75">
            The secure database connection has not been added to this environment.
            No password can be created here yet.
          </div>
        ) : staff ? (
          <form action={completeBookingStaffInvite} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/75"
              >
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                className="mt-3 w-full border border-pearl/20 bg-black px-4 py-3 text-base text-pearl outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/75"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                className="mt-3 w-full border border-pearl/20 bg-black px-4 py-3 text-base text-pearl outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
            {message ? (
              <p
                role="alert"
                className="border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100"
              >
                {message}
              </p>
            ) : null}
            <button type="submit" className="primary-button w-full">
              Activate private access
            </button>
          </form>
        ) : (
          <div className="mt-8 border border-gold/30 bg-gold/5 p-5 text-sm leading-7 text-pearl/75">
            <p>Verify the complete owner code before creating the private password.</p>
            <Link
              href="/admin/owner-access"
              className="mt-4 inline-block font-semibold text-gold underline underline-offset-4"
            >
              Request an owner code
            </Link>
          </div>
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
