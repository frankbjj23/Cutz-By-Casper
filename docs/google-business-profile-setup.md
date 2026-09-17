# Google Business Profile - created, verification processing

Prepared September 13, 2026; updated after the approved creation flow. The profile
has been created, but the final management panel reports **Verification
processing** and **NOT PUBLICLY VISIBLE**. Google says this can take up to five
days. No review URL is available/configured and no Google API billing is enabled.

## Confirmed by Frank in this task

- Casper did not have a Google Business Profile before this setup.
- Redeemed is currently his website/brand name, not permanent shop signage.
- Professional name supplied by Frank: Erick Muniz (known as Casper).
- Frank chose his own Google sign-in for the initial setup. Do not change users,
  add owners/managers, or transfer ownership without a separate approval.
- Public direct contact number for the intended listing: (201) 889-6440.
- Website: https://redeemedbycasper.com

The current Booksy profile was checked during setup and confirms 719 Grand Ave,
Ridgefield, NJ 07657. That exact address was entered, with no invented suite.

## Remaining before review activation

### Status checked September 17, 2026

The authenticated management panel under Frank's account still displays
**Google is processing your verification**, **Your business is not visible to
customers**, and **NOT PUBLICLY VISIBLE** for Erick Muniz at 719 Grand Ave.
No rejection or additional-proof request was shown on that panel. This was a
read-only check; no profile details or ownership were changed. Google's help
page says verification reviews can take up to five business days, occasionally
longer. The September 13 submission is still within that ordinary window.
The Google review button remains unconfigured pending verification and an
official review-sharing link. The four new September 17 portfolio photos are
website-only; they were not uploaded to Google as part of this status check.

- Wait for Google's final processing; do not treat the profile as public yet.
- Frank explicitly approved the Business Profile terms/data-sharing step and
  use of his account. No additional owner/manager was added and no ownership
  transfer was attempted. Plan Casper's ownership with Frank separately.
- Follow up if Google asks for evidence of eligibility at the shared shop. The
  listing uses Erick's professional name, not a fictitious Redeemed storefront.
- Confirm actual customer-facing hours, or whether appointments are the only
  way to visit. Do not automatically use the entire shop's hours.
- Get a real exterior photo and any other business photos from Casper if desired.
- Do not collect passwords or verification codes if Google requests more proof.

## Current browser handoff

Created under the visibly signed-in account **frankbjj23@gmail.com**:

- Name: Erick Muniz.
- Category: Barber shop.
- Address: 719 Grand Ave, Ridgefield, NJ 07657.
- Phone: (201) 889-6440.
- Website: https://redeemedbycasper.com/.
- Services selected: Beard trim, Fade cut, Haircut, Hair shape up.
- Setup scope: customers visit the shop; no delivery/home-visit area advertised.
- Hours left blank because only dated entries, not a complete recurring schedule,
  were visible in the public Booksy response.
- Optional chat, Google tips/updates, Ads credit, and Workspace trial skipped.

Google suggested **The Colonial Bar** at the same street address with a different
phone. It was not claimed, changed, or linked to this profile.

The automatic verification page displayed **You're now verified**, but the final
dashboard and Reviews panel both explicitly report **Verification processing**,
up to five days. The Reviews panel does not expose a review-sharing link yet.
Use the final dashboard state as authoritative, not the intermediate success.

Management identifiers: location `06264260156827994915`; dashboard business ID
`9041629640978938341`. The existing browser tab was left on the management panel
for follow-up. Do not reuse signed/private query tokens in shared links.

Description submitted during customization:

> Erick Muniz, known as Casper, offers precision haircuts, fades, tapers, beard grooming and shape-ups in Ridgefield, New Jersey. With 30 years in the industry, his approach combines old-school care, professionalism and a belief that every client comes first.

## Portfolio photos uploaded

Frank approved studio-edited versions on the website and unaltered originals on
Google. Eight original JPGs from `public/images/styles/` were uploaded: 01, 02,
03, 05, 06, 07, 08, and 10. Google displayed **Upload complete**, followed by
eight photos marked **PENDING**. Upload acceptance is not public publication;
the profile still reported verification processing. No cover or logo was set.

Frank also confirmed that Casper currently works inside **The Hair Hub**. Its
Booksy listing gives 719 Grand Ave, Unit A, Ridgefield, NJ 07657. The existing
Google address and description have not yet been changed to mention the shop.
Do not rename the practitioner profile to imply ownership of The Hair Hub.

Google's photo guidance requires a realistic representation without significant
alterations. Keep the website's generated black-studio derivatives off Google.

## Website review readiness

`GoogleReviewInvitation` is wired into the homepage and `/reviews`. It remains
hidden when `GOOGLE_REVIEW_URL` is missing or invalid. This link-only first phase
adds no provider requests, tracking scripts, paid widgets, or Google star ratings.

After verification, get the official **Read reviews > Get more reviews** link,
verify that it targets the correct listing, configure `GOOGLE_REVIEW_URL`, then
build, deploy, and check both buttons. The existing website review form does not
submit Google reviews. Booksy remains the only public booking system.

Displaying Google review text on the website remains pending until the listing
exists and has reviews. Follow Google's attribution and retention requirements,
and obtain approval for any API/widget charges before activation.

## Official references

- Create or claim: https://support.google.com/business/answer/2911778
- Names, eligibility, signage, practitioners, hours: https://support.google.com/business/answer/3038177
- Owner verification: https://support.google.com/business/answer/7107242
- Review link: https://support.google.com/business/answer/16816815
- Photo requirements: https://support.google.com/business/answer/6103862
- Review display requirements: https://developers.google.com/maps/documentation/places/web-service/policies
