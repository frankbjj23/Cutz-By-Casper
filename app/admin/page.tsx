import type { Metadata } from "next";
import { signOutBookingStaff } from "@/app/admin/actions";
import { requireBookingStaff } from "@/lib/server/booking-auth";
import { createBookingServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Private Booking Calendar",
  robots: { index: false, follow: false, nocache: true },
};

type AppointmentRow = {
  id: string;
  start_time_utc: string;
  status: string;
  service_name_snapshot: string;
  balance_due_cents: number;
  customers: { full_name: string } | null;
};

type BookingContactRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  created_at: string;
  expires_at: string | null;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatAppointmentTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatContactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const staff = await requireBookingStaff();
  const supabase = await createBookingServerClient();

  const now = new Date().toISOString();
  const [
    { data: appointments, error: appointmentError, count: appointmentCount },
    { count: serviceCount, error: serviceError },
    { data: bookingContacts, error: bookingContactError, count: bookingContactCount },
  ] =
    await Promise.all([
      supabase!
        .from("appointments")
        .select(
          "id, start_time_utc, status, service_name_snapshot, balance_due_cents, customers(full_name)",
          { count: "exact" },
        )
        .gte("start_time_utc", now)
        .in("status", ["pending_payment", "confirmed"])
        .order("start_time_utc", { ascending: true })
        .limit(20),
      supabase!
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      supabase!
        .from("booking_contacts")
        .select("id, full_name, email, phone_e164, created_at, expires_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  const rows = (appointments ?? []) as unknown as AppointmentRow[];
  const contactRows = (bookingContacts ?? []) as BookingContactRow[];

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
      <div className="flex flex-col gap-6 border-b border-gold/25 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Private booking room</p>
          <h1 className="mt-4 font-display text-4xl text-pearl sm:text-6xl">
            Appointment ledger
          </h1>
          <p className="mt-4 text-sm text-pearl/60">
            Signed in as {staff.email ?? "approved staff"} · {staff.role}
          </p>
        </div>
        <form action={signOutBookingStaff}>
          <button
            type="submit"
            className="border border-pearl/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-pearl transition hover:border-gold hover:text-gold"
          >
            Sign out
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4" aria-label="Booking summary">
        <div className="lux-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Upcoming</p>
          <p className="mt-3 font-display text-4xl text-gold">
            {appointmentError ? "—" : (appointmentCount ?? rows.length)}
          </p>
        </div>
        <div className="lux-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Active services</p>
          <p className="mt-3 font-display text-4xl text-gold">
            {serviceError ? "—" : (serviceCount ?? 0)}
          </p>
        </div>
        <div className="lux-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Saved contacts</p>
          <p className="mt-3 font-display text-4xl text-gold">
            {bookingContactError ? "—" : (bookingContactCount ?? contactRows.length)}
          </p>
        </div>
        <div className="lux-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Booking status</p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-pearl">
            Private test only
          </p>
        </div>
      </section>

      <section className="mt-8 border border-gold/25 bg-[#111113] p-5 sm:p-8" aria-labelledby="contacts-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Website handoff</p>
            <h2 id="contacts-heading" className="mt-4 font-display text-3xl text-pearl">
              Saved booking contacts
            </h2>
          </div>
          <p className="text-xs leading-5 text-pearl/50">Not confirmed Booksy appointments</p>
        </div>

        {bookingContactError ? (
          <p role="alert" className="mt-6 border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100">
            Saved booking contacts could not be loaded.
          </p>
        ) : contactRows.length === 0 ? (
          <p className="mt-8 text-sm leading-7 text-pearl/60">
            No one has used the website contact handoff yet.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-pearl/10">
            {contactRows.map((contact) => (
              <article key={contact.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_1.25fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-pearl">{contact.full_name}</p>
                  <p className="mt-1 text-xs text-pearl/45">
                    Saved {formatContactDate(contact.created_at)}
                  </p>
                </div>
                <div className="space-y-1 text-sm text-pearl/70">
                  {contact.phone_e164 ? <p>{contact.phone_e164}</p> : null}
                  {contact.email ? <p className="break-all">{contact.email}</p> : null}
                </div>
                <p className="text-xs text-pearl/45">
                  {contact.expires_at
                    ? `Legacy notice: expires ${formatContactDate(contact.expires_at)}`
                    : "Kept until deleted"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 border border-pearl/15 bg-[#111113] p-5 sm:p-8" aria-labelledby="upcoming-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="upcoming-heading" className="font-display text-3xl text-pearl">
            Upcoming appointments
          </h2>
          <span className="text-xs uppercase tracking-[0.18em] text-pearl/50">Eastern time</span>
        </div>

        {appointmentError ? (
          <p role="alert" className="mt-6 border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100">
            The private appointment ledger could not be loaded.
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-8 text-sm leading-7 text-pearl/60">
            No custom-system appointments yet. That is expected while Booksy remains live.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-pearl/10">
            {rows.map((appointment) => (
              <article key={appointment.id} className="grid gap-3 py-5 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-pearl">
                    {appointment.customers?.full_name ?? "Customer"}
                  </p>
                  <p className="mt-1 text-sm text-pearl/55">{appointment.service_name_snapshot}</p>
                </div>
                <div>
                  <p className="text-sm text-pearl/80">{formatAppointmentTime(appointment.start_time_utc)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gold">{appointment.status.replace("_", " ")}</p>
                </div>
                <p className="text-sm text-pearl/70">{formatMoney(appointment.balance_due_cents)} due</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

