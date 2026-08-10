# Redeemed Precision Grooming

Redeemed Precision Grooming is Casper's mobile-first premium barbering portfolio
and booking handoff in Ridgefield Park, New Jersey. The brand story is grounded in 30 years
in the industry, faith, professionalism, relationships, and client-first service.

Customers can browse Casper's work on the site, then use his existing Booksy profile
for the current service menu, prices, policies, and live appointment availability.
Booksy is the sole booking calendar.

An invitation-only, noindex `/preview` beta lets an adult submit one self-photo and
create one temporary AI hair, beard, or color concept. The site does not persist the
input or result, and no photo is transferred to Booksy.

Casper's exact Ridgefield Park street address is not hard-coded while Booksy still
shows the former Lyndhurst location. Confirm the new appointment details before travel.

## Live links

- Website: https://cutz-by-casper-umri.vercel.app
- Booking: https://booksy.com/en-us/dl/show-business/697614

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vercel
- Booksy for third-party booking
- OpenAI Image API for the private style-preview beta
- Sharp for full server-side image decoding, metadata removal, and normalization

The website does not maintain a custom booking database, payment checkout, SMS
service, admin calendar, or automated chat service.

The existing Vercel URL and GitHub repository retain the prior project slug so live
links and deployment integrations do not break during the public-facing rebrand.

## Local development

Requirements:

- Node.js 22
- npm

Install and run:

    npm ci
    npm run dev

Copy `.env.example` to `.env.local`, then provide `OPENAI_API_KEY` only when testing a
real image generation. The site and all non-billable checks build without the key.
The checked-in invitation hash protects the initial beta; rotate it with
`STYLE_PREVIEW_ACCESS_HASH` when needed.

Open http://localhost:3000.

## Quality checks

    npm run lint
    npm run typecheck
    npm test
    npm run scan-encoding

The Playwright tests build the production application and verify the customer routes,
canonical Booksy links, retired API routes, SEO discovery files, and mobile overflow.

## Routes

- / — services overview, booking path, gallery preview, and location
- /styles — filterable haircut portfolio
- /book — branded handoff to Casper's canonical Booksy profile
- /privacy — site and third-party booking privacy boundary
- /preview — linked from the homepage, noindex, invitation-only style-preview beta
- /api/style-preview — same-origin, invite-protected image-edit route
- /robots.txt and /sitemap.xml — search discovery files

`/preview` remains absent from the global navigation and sitemap. Do not remove the
invitation gate, enable indexing, or promote open access until durable rate limiting,
a reviewed provider agreement, production cost controls, and a larger authorized-photo
quality evaluation are complete.

## Booking source of truth

Do not hard-code Booksy review totals, availability, holiday closures, prices, or
policies into this site. Those details can change and should be read from Casper's
live Booksy profile.

Booksy's public profile cannot be embedded in an iframe. If an embedded booking
experience is added later, use only the unique widget code generated inside Casper's
Booksy Biz account.
