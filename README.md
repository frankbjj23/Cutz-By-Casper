# Redeemed by Casper

Redeemed by Casper is the project and domain identity for Redeemed Precision Grooming,
Casper's mobile-first premium barbering portfolio and booking handoff in Ridgefield,
New Jersey. The public brand story is grounded in 30 years
in the industry, faith, professionalism, relationships, and client-first service.

Customers can browse Casper's work on the site, optionally save a consent-based name
and phone number and/or email in the protected website database, then continue to
Casper's individual SQUIRE page for the current service menu, prices, policies, and
live appointment availability. SQUIRE handles new appointments. The website contact
record is separate and does not synchronize an appointment status back from SQUIRE.

The saved website record is a booking handoff contact, not a confirmed appointment
and not marketing consent. It is available only to approved staff in the private
dashboard. New contacts have no automatic expiration and remain until approved staff
deletes them or the customer requests deletion. Legacy contacts keep the 12-month
limit shown when they originally consented. Matching email addresses or phone numbers
are consolidated into one master contact with all unique methods and a handoff count.

An invitation-only, noindex `/preview` beta lets an adult submit one self-photo and
create one temporary AI hair, beard, or color concept. The site does not persist the
input or result, and no photo is transferred to SQUIRE.

Casper works inside The HairHub at 719 Grand Ave, Ridgefield, NJ 07657. Customers
should confirm the final appointment time and location on SQUIRE before traveling.

## Live links

- Website: https://redeemedbycasper.com
- Booking: https://getsquire.com/booking/book/the-hairhub-ridgefield/barber/casper-master-barber/services

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vercel
- Casper's individual SQUIRE page for third-party booking
- Supabase for protected booking-contact storage and the private staff dashboard
- OpenAI Image API for the private style-preview beta
- Sharp for full server-side image decoding, metadata removal, and normalization

The production website does not accept custom bookings or payments. It offers
an optional website-owned contact handoff before SQUIRE. The codebase also contains a
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
booking-contact validation and graceful fallback, canonical SQUIRE links, retired API
routes, SEO discovery files, and mobile overflow.

## Routes

- / — services overview, booking path, gallery preview, and location
- /styles — filterable haircut portfolio
- /book — optional website contact capture followed by Casper's individual SQUIRE page
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

## Google reviews setup (not activated)

The homepage and `/reviews` have a conditional Google review invitation. It is
hidden unless `GOOGLE_REVIEW_URL` contains Casper's confirmed, direct Google
review link. No placeholder listing, Google stars/counts, Google API calls,
third-party widget, or Google charges are enabled by this preparation.

Before activation:

1. Confirm Casper's real-world business/practitioner name, eligibility at the
   shared shop, direct business phone, address, and customer-facing hours.
2. Create/verify the appropriate Google Business Profile under Casper's control.
   Google chooses the verification method; do not share passwords or codes.
3. In the verified profile, choose **Read reviews > Get more reviews** and copy
   its direct link. Confirm it opens the correct business's review composer.
4. Set `GOOGLE_REVIEW_URL` in the deployment environment, rebuild/redeploy, and
   verify both buttons on desktop and mobile. Accepted formats are Google's
   `https://g.page/r/<id>/review` (or legacy `g.page/<name>/review`) and
   `https://search.google.com/local/writereview?placeid=<id>`. A general Maps
   share/search link is intentionally not accepted as a review-composer link.

Displaying Google review text on-site is a separate, pending step after the
profile is live and has reviews. Select a supported provider/integration and
approve any billing first; follow Google attribution, content retention, and
privacy/terms requirements. Do not insert Google data into the existing
Booksy/website review tables or relabel existing reviews as Google reviews.

Official setup guidance: https://support.google.com/business/answer/2911778
Review link guidance: https://support.google.com/business/answer/16816815

## Booking source of truth

Do not hard-code SQUIRE availability, holiday closures, prices, or booking policies
into this site. Those details can change and should be confirmed on Casper's individual
SQUIRE page.

Use `https://getsquire.com/booking/book/the-hairhub-ridgefield/barber/casper-master-barber/services`
as the canonical customer handoff. It is Casper's verified individual SQUIRE services
page at The HairHub.
Booksy remains only as source attribution for imported contacts and displayed Booksy
reviews; it is not a new-booking destination.
