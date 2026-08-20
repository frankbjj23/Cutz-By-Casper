# Custom booking foundation

This branch introduces the private foundation for moving Redeemed by Casper away
from Booksy. It does **not** switch the public booking buttons or accept live customer
payments yet.

## Current activation status

- The dedicated `Redeemed Booking` Supabase project is active in the East Coast
  region at the connected account's confirmed $0 monthly project cost.
- Both database migrations are applied.
- The reusable database contract tests pass against the live project.
- Supabase's live security advisor reports no findings.
- The database contains only configuration, six service seeds, and five weekly-hour
  rows. It contains no staff, customers, appointments, or payments yet.
- Casper's owner account and the Vercel environment connection are intentionally
  waiting for an approved owner email and a reviewed deployment.

## Approved first-version rules

- Seed the current Booksy services, prices, durations, and published weekly hours as
  editable starting data.
- Require a $10 non-refundable deposit to confirm an appointment.
- Credit the deposit toward the final service price.
- Transfer the deposit when an appointment is rescheduled at least 24 hours ahead.
- Forfeit the deposit for a late change, cancellation, or no-show.
- Use Ridgefield Park, New Jersey, without publishing an unverified street address.
- Keep Booksy active until the new calendar, Stripe test mode, notifications, and
  owner workflows pass end-to-end testing.

## Security model

- Every application table has Row Level Security enabled.
- The anonymous Supabase role receives no table or booking-function privileges.
- Customer booking will go through a rate-limited Next.js server route rather than
  writing directly to the database.
- Staff access requires both a verified Supabase Auth session and an active row in
  `staff_members`.
- The public booking transaction derives duration, price, deposit, policy, hours,
  and balance from trusted database rows. Browser-supplied values are not trusted.
- A database exclusion constraint and transaction lock prevent two customers from
  holding the same time.
- Stripe webhook event IDs and payment identifiers are unique for idempotency.
- Appointment confirmation queues owner notifications and Google Calendar sync in
  the same transaction as the payment record.

## Initial data

The migration seeds six services from Casper's Booksy profile. The five fixed-price
services are online-bookable. The before/after-hours service is stored but remains
offline because it starts at $100 and requires direct confirmation.

The weekly hours seed is:

- Monday, 11:00 AM–6:00 PM
- Wednesday, 11:00 AM–6:00 PM
- Thursday, 10:00 AM–7:00 PM
- Friday, 11:00 AM–7:00 PM
- Saturday, 10:00 AM–5:00 PM
- Tuesday and Sunday closed

These values are editable and must be reviewed by Casper before cutover.

## Activation order

1. Create Casper's Auth user with signup disabled for the public.
2. Add Casper's Auth user ID to `staff_members` with the `owner` role.
3. Add the booking-specific Supabase URL and publishable key to the private preview
   environment, then verify `/admin/login` and RLS.
4. Build the public availability endpoint and Stripe test checkout.
5. Add signed customer management links, notification delivery, and Google Calendar
   OAuth/sync.
6. Run a closed pilot while Booksy remains the operational calendar.
7. Reconcile future Booksy appointments and choose a cutover date before changing
   public booking buttons.

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
