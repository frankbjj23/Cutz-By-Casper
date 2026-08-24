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
  first_seen_at: string;
  last_seen_at: string;
  handoff_count: number;
  expires_at: string | null;
  booking_contact_methods: Array<{
    kind: "email" | "phone";
    value: string;
  }>;
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
        .select(
          "id, full_name, email, phone_e164, first_seen_at, last_seen_at, handoff_count, expires_at, booking_contact_methods(kind, value)",
          { count: "exact" },
        )
        .order("last_seen_at", { ascending: false })
        .limit(500),
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
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Master contacts</p>
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
            <p className="eyebrow">Master contact sheet</p>
            <h2 id="contacts-heading" className="mt-4 font-display text-3xl text-pearl">
              One person, one contact
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-5 text-pearl/50">
            Repeated handoffs merge by email or phone. These are not confirmed Booksy appointments.
          </p>
        </div>

        {bookingContactError ? (
          <p role="alert" className="mt-6 border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100">
            The master contact sheet could not be loaded.
          </p>
        ) : contactRows.length === 0 ? (
          <p className="mt-8 text-sm leading-7 text-pearl/60">
            No one has used the website contact handoff yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto border border-pearl/10">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Deduplicated website-to-Booksy contact master sheet
              </caption>
              <thead className="bg-black/35 text-[0.65rem] uppercase tracking-[0.16em] text-pearl/55">
                <tr>
                  <th scope="col" className="px-4 py-4 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Phone</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-4 font-semibold">First saved</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Last handoff</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold">Handoffs</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl/10">
                {contactRows.map((contact) => {
                  const phones = contact.booking_contact_methods
                    .filter((method) => method.kind === "phone")
                    .map((method) => method.value);
                  const emails = contact.booking_contact_methods
                    .filter((method) => method.kind === "email")
                    .map((method) => method.value);

                  if (phones.length === 0 && contact.phone_e164) phones.push(contact.phone_e164);
                  if (emails.length === 0 && contact.email) emails.push(contact.email);

                  return (
                    <tr key={contact.id} className="align-top text-pearl/70">
                      <th scope="row" className="px-4 py-5 font-semibold text-pearl">
                        {contact.full_name}
                      </th>
                      <td className="space-y-1 px-4 py-5">
                        {phones.map((phone) => <p key={phone}>{phone}</p>)}
                      </td>
                      <td className="space-y-1 px-4 py-5">
                        {emails.map((email) => <p key={email} className="break-all">{email}</p>)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-5">
                        {formatContactDate(contact.first_seen_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-5">
                        {formatContactDate(contact.last_seen_at)}
                      </td>
                      <td className="px-4 py-5 text-center font-semibold text-gold">
                        {contact.handoff_count}
                      </td>
                      <td className="px-4 py-5 text-xs leading-5 text-pearl/50">
                        {contact.expires_at
                          ? `Legacy notice: expires ${formatContactDate(contact.expires_at)}`
                          : "Kept until deleted"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

