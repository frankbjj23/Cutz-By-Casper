# Custom booking foundation

This codebase contains the private foundation for moving Redeemed by Casper away
from a third-party calendar. It does **not** accept live customer appointments or
payments. New customer appointments are handled on Casper's individual Booksy page.

## Current activation status

- The dedicated `Redeemed Booking` Supabase project is active in the East Coast
  region.
- All three migrations are applied, including the Ridgefield location correction.
- The live address row was verified after the correction. The reusable database contract
  tests cover the location setting along with the existing RLS and booking rules.
- The database contains configuration, six service seeds, five weekly-hour rows, one
  approved staff row, and one staff notification-settings row. It contains no customer,
  appointment, payment, webhook, notification, or calendar-sync records as of the
  August 24, 2026 audit.
- The Vercel environment is connected and owner access uses a typed 6–10 digit email
  code. The dashboard remains a private contact-and-review surface; Booksy is the
  public appointment system.
- Supabase's security advisor currently recommends enabling leaked-password protection.
  That hosted Auth setting should be reviewed before a customer-booking pilot. Its
  performance advisor also reports unused indexes, which is expected while the booking
  tables contain no operational traffic; do not remove the conflict, payment, or queue
  indexes solely because of those notices.

## Approved first-version rules

- Seed the current Booksy services, prices, durations, and published weekly hours as
  editable starting data.
- Require a $10 non-refundable deposit to confirm an appointment.
- Credit the deposit toward the final service price.
- Transfer the deposit when an appointment is rescheduled at least 24 hours ahead.
- Forfeit the deposit for a late change, cancellation, or no-show.
- Seed the current verified Booksy location, 719 Grand Ave, Ridgefield, NJ 07657, and
  reconfirm it with Casper before custom-booking cutover.
- Keep Booksy active until the new calendar, Stripe test mode, notifications, and
  owner workflows pass end-to-end testing.

## Security model

- Every application table has Row Level Security enabled.
- The anonymous Supabase role receives no table or booking-function privileges.
- Customer booking will go through a rate-limited Next.js server route rather than
  writing directly to the database.
- Staff access requires both a verified Supabase Auth session and an active row in
  `staff_members`.
- Owner activation uses a typed 6–10 digit email code. Email templates must not use
  a one-click authentication URL because automated email scanners can consume it.
- The public booking transaction derives duration, price, deposit, policy, hours,
  and balance from trusted database rows. Browser-supplied values are not trusted.
- A database exclusion constraint and transaction lock prevent two customers from
  holding the same time.
- Stripe webhook event IDs and payment identifiers are unique for idempotency.
- Appointment confirmation queues owner notifications and Google Calendar sync in
  the same transaction as the payment record.

## Initial data

The migration seeds six historical services from Casper's former Booksy profile. The
custom appointment system is dormant, so none of these services are publicly bookable
through the website. The before/after-hours seed must remain offline unless Casper
separately approves a future activation.

The weekly hours seed is:

- Monday, 11:00 AM–6:00 PM
- Wednesday, 11:00 AM–6:00 PM
- Thursday, 10:00 AM–7:00 PM
- Friday, 11:00 AM–7:00 PM
- Saturday, 10:00 AM–5:00 PM
- Tuesday and Sunday closed

These values are editable historical seeds, not current live Booksy configuration.

## Guardrails for any future custom-booking project

1. Treat Booksy as the operational appointment calendar unless Casper separately
   approves another migration.
2. Reconfirm Casper's approved owner email, service menu, working hours, policies, and
   location details before using the private dashboard operationally.
3. Enable leaked-password protection and complete an owner sign-in/RLS smoke test.
4. Build the public availability endpoint and Stripe test checkout.
5. Add signed customer management links, notification delivery, and Google Calendar
   OAuth/sync.
6. Run a closed pilot without changing the public Booksy handoff.
7. Reconcile future Booksy appointments and choose a separate approved cutover date
   before changing public booking buttons again.

The Stripe checkout session and database hold will both use 30 minutes because
Stripe currently allows custom Checkout expiration from 30 minutes to 24 hours.

## Local verification performed

The migration was executed from a blank PostgreSQL 18 database with Supabase roles
and Auth helpers represented locally. Verification covered:

- migration syntax and seed counts;
- RLS and anonymous denial;
- active-owner access and non-staff denial;
- closed-day rejection;
- time-block rejection;
- simultaneous booking attempts for one slot, with exactly one winner;
- $10 payment confirmation, remaining balance calculation, owner notification job,
  and Google Calendar sync job.

`supabase/tests/booking_foundation_test.sql` provides reusable catalog and policy
checks for the eventual Supabase project.
