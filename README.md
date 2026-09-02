# Redeemed by Casper

Redeemed by Casper is the project and domain identity for Redeemed Precision Grooming,
Casper's mobile-first premium barbering portfolio and booking handoff in Ridgefield,
New Jersey. The public brand story is grounded in 30 years
in the industry, faith, professionalism, relationships, and client-first service.

Customers can browse Casper's work on the site, optionally save a consent-based name
and phone number and/or email in the protected website database, then use his existing
official Booksy widget for the current service menu, prices, policies, and live
appointment availability without first leaving the website.
Booksy remains the sole live booking calendar while a private custom-booking
foundation is developed and tested. The public site has not been switched.

The saved website record is a booking handoff contact, not a confirmed appointment
and not marketing consent. It is available only to approved staff in the private
dashboard. New contacts have no automatic expiration and remain until approved staff
deletes them or the customer requests deletion. Legacy contacts keep the 12-month
limit shown when they originally consented. Matching email addresses or phone numbers
are consolidated into one master contact with all unique methods and a handoff count.

An invitation-only, noindex `/preview` beta lets an adult submit one self-photo and
create one temporary AI hair, beard, or color concept. The site does not persist the
input or result, and no photo is transferred to Booksy.

The site reflects the current Booksy listing at 719 Grand Ave, Ridgefield, NJ 07657.
Booksy remains the authority for appointment and location details before travel.

## Live links

- Website: https://redeemedbycasper.com
- Booking: https://booksy.com/en-us/dl/show-business/697614

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vercel
- Casper's official Booksy widget for third-party booking
- Supabase for protected booking-contact storage and the private staff dashboard
- OpenAI Image API for the private style-preview beta
- Sharp for full server-side image decoding, metadata removal, and normalization

The production website does not yet accept custom bookings or payments. It does offer
an optional website-owned contact handoff before Booksy. The codebase also contains a
locked-down Supabase schema and private owner dashboard foundation.
Owner access uses a 6–10 digit email code typed into the site so automated
email link checks cannot consume access. Stripe checkout, notifications, Google
Calendar delivery, and the customer calendar are the next test-mode phases. See
`docs/custom-booking-foundation.md` for the approved rules and rollout gates.

The Vercel project and GitHub repository retain the prior project slug so the existing
deployment integration continues to work behind the Redeemed by Casper domain.

## Local development

Requirements:

- Node.js 22
- npm

Install and run:

    npm ci
    npm run dev

Copy `.env.example` to `.env.local`, then provide `OPENAI_API_KEY` only when testing a
real image generation. The site and all non-billable checks build without the key.
Set `STYLE_PREVIEW_ACCESS_HASH` to the SHA-256 hash of the invitation code in every
environment where the private preview should be enabled. Without it, access fails
closed.

In Vercel Production, set `STYLE_PREVIEW_ALLOWED_ORIGIN` to
`https://redeemedbycasper.com`. Keep preview and local values scoped to their own
origins so the exact-origin guard does not block those environments.

Open http://localhost:3000.

## Quality checks

    npm run lint
    npm run typecheck
    npm test
    npm run scan-encoding

The Playwright tests build the production application and verify the customer routes,
booking-contact validation and graceful fallback, canonical Booksy links, retired API
routes, SEO discovery files, and mobile overflow.

## Routes

- / — services overview, booking path, gallery preview, and location
- /styles — filterable haircut portfolio
- /book — optional website contact capture followed by Casper's canonical Booksy profile
- /reviews — on-site review submission with private staff moderation and clear source labels
- /privacy — site storage, style-preview, and third-party booking privacy boundaries
- /preview — linked from the homepage, noindex, invitation-only style-preview beta
- /api/style-preview — same-origin, invite-protected image-edit route
- /api/booking-contact — same-origin, validated server handoff to the protected Supabase receiver
- /api/reviews — same-origin, validated handoff to the moderated review inbox
- /admin/login — noindex private booking-owner sign-in for the dormant custom-booking
  foundation
- /robots.txt and /sitemap.xml — search discovery files

`/preview` remains absent from the global navigation and sitemap. Do not remove the
invitation gate, enable indexing, or promote open access until durable rate limiting,
a reviewed provider agreement, production cost controls, and a larger authorized-photo
quality evaluation are complete.

## Booking source of truth

Do not hard-code Booksy review totals, availability, holiday closures, prices, or
policies into this site. Those details can change and should be read from Casper's
live Booksy profile.

The official Booksy widget uses business ID `697614`, country `us`, and language
`en-US`, exactly as supplied from Casper's Booksy Biz account. Do not replace it with
an arbitrary iframe or a different business ID. The canonical direct Booksy profile
remains the fallback when the widget is blocked or unavailable.
