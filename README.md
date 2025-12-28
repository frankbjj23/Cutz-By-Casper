# Cutz By Casper

Premium, mobile-first booking app for a single-barber studio.

## Stack
- Next.js (App Router) + TypeScript
- TailwindCSS
- Supabase Postgres
- Stripe Checkout
- Twilio SMS

## Setup
1) Install dependencies
```
npm install
```

2) Create a Supabase project
- Run the SQL in `supabase/migrations/001_init.sql`
- Run seed data in `supabase/seed/seed.sql`

3) Configure environment variables
- Copy `.env.example` to `.env.local` and fill values.

4) Run the app
```
npm run dev
```

## Supabase Setup
1) Create a Supabase project in the Supabase dashboard.
2) Open the SQL editor and run `supabase/migrations/001_init.sql`.
3) Run `supabase/seed/seed.sql`.
4) Get keys from Project Settings -> API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5) Add them to `.env.local` and restart the dev server.

## Stripe Setup
1) Add environment variables:
   - `STRIPE_SECRET_KEY` (Project Settings -> API keys)
   - `STRIPE_WEBHOOK_SECRET` (generated when you create the webhook)
2) Create a webhook endpoint in the Stripe dashboard:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`
3) Local dev with Stripe CLI:
```
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

## AI Secretary
- Set `OPENAI_API_KEY` in `.env.local` for the assistant API route.
- The voice input uses the browser Web Speech API (best in Chrome/Edge).
- OpenAI TTS voice replies require `OPENAI_API_KEY`; audio playback may be blocked until user interaction.

## AI Secretary Setup
1) Create a `.env.local` file in the project root.
2) Set `OPENAI_API_KEY=...` inside `.env.local`.
3) Restart the dev server (Ctrl+C, then `npm run dev`).

## Scheduling Jobs
Recommended frequencies:
- `expire-holds`: every 1-5 minutes
- `send-reminders`: every 5 minutes

Commands:
```
npm run expire-holds
npm run send-reminders
```

Example: Vercel Cron (vercel.json)
```
{
  "crons": [
    { "path": "/api/cron/expire-holds", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/send-reminders", "schedule": "*/5 * * * *" }
  ]
}
```

## Stripe Webhook
- Configure webhook endpoint: `/api/stripe/webhook`
- Events: `checkout.session.completed`

## Supabase Auth (Admin)
- Create an admin user in Supabase Auth
- Visit `/admin` to sign in and access admin tools
  - Use the calendar view to block time for breaks/vacation

## Deployment (Vercel + Supabase)
- Add environment variables in Vercel
- Set `NEXT_PUBLIC_BASE_URL` to your production URL
- Ensure Stripe webhook points to your deployed `/api/stripe/webhook`

## Structure
- `app/` Next.js routes and pages
- `lib/` shared utilities
- `scripts/` scheduled job scripts
- `supabase/` migrations + seed
- `tests/` vitest tests

## Image Assets
- Place the Casper profile image at `public/images/casper/casper-profile.jpg`.
- Place 20 haircut images at `public/images/styles/01-*.jpg` through `public/images/styles/20-*.jpg`.

## Policies enforced
- $20 deposit via Stripe Checkout
- Reschedule allowed only 72+ hours before
- Pending payment holds expire after 10 minutes
- Late policy: eligible no-show after +15 minutes (admin action)
- SMS opt-in required for messaging

## First Booking Test
- [ ] App loads and Tailwind styles apply (hero typography, colors, spacing).
- [ ] Address/phone/hours match: 442 Ridge Rd, Lyndhurst, NJ 07071 and (201) 889-6440.
- [ ] Supabase connection works; services list appears on `/book`.
- [ ] Services show correct prices/durations, including $100+ for after-hours.
- [ ] Availability endpoint returns open slots for a valid date/service.
- [ ] Closed days (Mon/Tue) return no availability.
- [ ] Checkout creates `pending_payment` appointment and returns a Stripe Checkout URL.
- [ ] Stripe payment triggers webhook; appointment status updates to `booked`.
- [ ] Confirmation SMS is sent (Twilio logs + `sms_logs` entry).
- [ ] Reminder job sends SMS at correct time (for dev, temporarily change the window to 2-5 minutes and run `npm run send-reminders`).
- [ ] Admin can mark `no_show` after start+15; payment status becomes `forfeited`.
