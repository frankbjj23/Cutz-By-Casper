# Cutz By Casper

Cutz By Casper is a mobile-first barber portfolio and booking handoff for Casper in
Lyndhurst, New Jersey.

Customers can browse Casper's work on the site, then use his existing Booksy profile
for the current service menu, prices, policies, and live appointment availability.
Booksy is the sole booking calendar.

An unlisted, invitation-only `/preview` beta lets an adult submit one self-photo and
create one temporary AI hair, beard, or color concept. The site does not persist the
input or result, and no photo is transferred to Booksy.

## Live links

- Website: https://cutz-by-casper-umri.vercel.app
- Booking: https://booksy.com/en-us/697614_casper_barber-shop_28371_lyndhurst

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vercel
- Booksy for third-party booking
- OpenAI Image API for the private style-preview beta

The website does not maintain a custom booking database, payment checkout, SMS
service, admin calendar, or automated chat service.

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
- /preview — unlisted, noindex, invitation-only style-preview beta
- /api/style-preview — same-origin, invite-protected image-edit route
- /robots.txt and /sitemap.xml — search discovery files

`/preview` is intentionally absent from public navigation and the sitemap. Do not make
it public until durable rate limiting, a reviewed provider agreement, production cost
controls, and a larger authorized-photo quality evaluation are complete.

## Booking source of truth

Do not hard-code Booksy review totals, availability, holiday closures, prices, or
policies into this site. Those details can change and should be read from Casper's
live Booksy profile.

Booksy's public profile cannot be embedded in an iframe. If an embedded booking
experience is added later, use only the unique widget code generated inside Casper's
Booksy Biz account.
