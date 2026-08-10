# Cutz By Casper

Cutz By Casper is a mobile-first barber portfolio and booking handoff for Casper in
Lyndhurst, New Jersey.

Customers can browse Casper's work on the site, then use his existing Booksy profile
for the current service menu, prices, policies, and live appointment availability.
Booksy is the sole booking calendar.

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

The website does not maintain a custom booking database, payment checkout, SMS
service, admin calendar, or automated chat service.

## Local development

Requirements:

- Node.js 22
- npm

Install and run:

    npm ci
    npm run dev

Open http://localhost:3000.

No environment variables are required.

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
- /robots.txt and /sitemap.xml — search discovery files

## Booking source of truth

Do not hard-code Booksy review totals, availability, holiday closures, prices, or
policies into this site. Those details can change and should be read from Casper's
live Booksy profile.

Booksy's public profile cannot be embedded in an iframe. If an embedded booking
experience is added later, use only the unique widget code generated inside Casper's
Booksy Biz account.
