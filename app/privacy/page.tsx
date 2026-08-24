import type { Metadata } from "next";
import {
  BOOKSY_PRIVACY_URL,
  BOOKSY_URL,
  BRAND_OG_PATH,
  business,
  OPENAI_DATA_CONTROLS_URL,
  SITE_URL,
} from "@/lib/site";

const description =
  `Privacy information for the ${business.name} website, private style preview, and Booksy booking link.`;

export const metadata: Metadata = {
  title: "Privacy",
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: `Privacy | ${business.name}`,
    description,
    url: SITE_URL + "/privacy",
    siteName: business.name,
    images: [BRAND_OG_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: `Privacy | ${business.name}`,
    description,
    images: [BRAND_OG_PATH],
  },
};

export default function PrivacyPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <article className="lux-card space-y-10 p-7 sm:p-12">
        <header className="space-y-5 border-b border-white/10 pb-10">
          <p className="eyebrow">Effective August 24, 2026</p>
          <h1 className="font-display text-5xl text-pearl sm:text-7xl">Privacy</h1>
          <p className="max-w-2xl text-sm leading-7 text-pearl/60">
            This page explains how the website, its booking-contact handoff,
            invitation-only style preview, and Casper&apos;s third-party booking system
            handle information.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-2xl text-pearl">This website</h2>
          <p className="text-sm leading-7 text-pearl/60">
            This site does not offer public user accounts, process payments, or confirm
            appointments. It offers the optional booking-contact form described below.
            Vercel, the hosting provider, may process limited technical information needed
            to deliver and secure the site.
          </p>
        </section>

        <section id="booking-contact" className="scroll-mt-28 space-y-5">
          <div>
            <p className="eyebrow">Before Booksy</p>
            <h2 className="mt-4 font-display text-3xl text-pearl">Website booking contact</h2>
          </div>
          <p className="text-sm leading-7 text-pearl/60">
            If you choose Save &amp; Continue to Booksy, this site stores your name and the
            mobile number, email address, or both that you submit. It also stores the time
            and version of your consent, the source page, and a one-way keyed network hash
            used for abuse protection. The raw network address is not placed in the booking
            contact table.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="border border-white/10 p-5">
              <h3 className="font-display text-xl text-pearl">Why it is kept</h3>
              <p className="mt-3 text-sm leading-7 text-pearl/60">
                Casper and approved staff may use these details to recognize and follow up
                with people who started the booking handoff. A saved contact is not proof
                that an appointment was completed or confirmed on Booksy.
              </p>
            </div>
            <div className="border border-white/10 p-5">
              <h3 className="font-display text-xl text-pearl">Retention and choice</h3>
              <p className="mt-3 text-sm leading-7 text-pearl/60">
                New booking contacts are kept until approved staff deletes them or the
                customer requests deletion. Earlier contacts submitted under a fixed
                12-month notice remain governed by that earlier promise. The consent is for
                booking follow-up only; it does not add you to a marketing list. You may
                instead use the direct Booksy link without saving information on this site.
              </p>
            </div>
          </div>
          <p className="text-sm leading-7 text-pearl/60">
            Supabase hosts the protected booking-contact database and its secure receiving
            function. Table access is blocked for anonymous visitors. Approved staff can
            view or delete booking contacts through the private dashboard.
          </p>
        </section>

        <section id="style-preview" className="scroll-mt-28 space-y-5">
          <div>
            <p className="eyebrow">Invitation-only beta</p>
            <h2 className="mt-4 font-display text-3xl text-pearl">Private hair &amp; beard preview</h2>
          </div>
          <p className="text-sm leading-7 text-pearl/60">
            Adults who have an invitation may submit one photo of themselves and select a
            fixed hair, beard, or hair-color direction. The feature sends the prepared image,
            selected direction, and confirmation of adult self-photo consent to a Redeemed
            Precision Grooming server function. After validation, that function sends the image and fixed
            edit instructions to OpenAI solely to create the requested preview.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="border border-white/10 p-5">
              <h3 className="font-display text-xl text-pearl">What this site keeps</h3>
              <p className="mt-3 text-sm leading-7 text-pearl/60">
                The photo and result are processed in server memory and returned directly to
                your browser. They are not saved to a Redeemed Precision Grooming database, file store,
                portfolio, public gallery, or marketing list. The result remains in your
                browser until you delete it, replace it, refresh, or close the page. If you
                download a look card, that separate copy remains on your device until you
                delete it there.
              </p>
            </div>
            <div className="border border-white/10 p-5">
              <h3 className="font-display text-xl text-pearl">OpenAI processing</h3>
              <p className="mt-3 text-sm leading-7 text-pearl/60">
                Under OpenAI&apos;s default API data controls, API content is not used to train
                its models unless the account owner opts in. OpenAI may retain abuse-monitoring
                logs containing submitted content for up to 30 days. Review the{" "}
                <a
                  href={OPENAI_DATA_CONTROLS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-pearl underline decoration-gold underline-offset-8"
                >
                  OpenAI API data controls
                </a>
                .
              </p>
            </div>
          </div>
          <p className="text-sm leading-7 text-pearl/60">
            The feature does not create a facial-recognition database, identify the person,
            infer sensitive traits, transfer the image to Booksy, or make the image public.
            The invitation code is kept only for the browser session. Choosing Delete clears
            this site&apos;s browser copies but cannot erase provider safety logs already created.
            Do not use the feature if you do not agree to this processing.
          </p>
          <p className="text-sm leading-7 text-pearl/60">
            To slow repeated access attempts and generations, the server temporarily keeps a
            one-way hash of the requesting network address in process memory. The raw address
            is not added to a Redeemed Precision Grooming database. Access-attempt counters expire after 15
            minutes; request-processing and generation counters expire after one hour. Hosting
            security logs may follow Vercel&apos;s separate retention practices.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl text-pearl">Booksy bookings</h2>
          <p className="text-sm leading-7 text-pearl/60">
            After the optional website contact step, Casper&apos;s official Booksy calendar may
            open in an embedded window on this site. That window is still provided and
            operated by Booksy. Booksy separately processes the information you enter there
            under its own terms and privacy practices. Review the{" "}
            <a
              href={BOOKSY_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pearl underline decoration-gold underline-offset-8"
            >
              Booksy Privacy Notice
            </a>{" "}
            before submitting information, or go directly to the{" "}
            <a
              href={BOOKSY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pearl underline decoration-gold underline-offset-8"
            >
              Booksy booking profile
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl text-pearl">Questions</h2>
          <p className="text-sm leading-7 text-pearl/60">
            For information submitted through Booksy, contact Booksy through its published
            support and privacy channels. To ask about or request deletion of a website
            booking contact, contact Casper through the contact option on his Booksy
            profile. For a question about the private preview, do not upload a photo.
          </p>
        </section>
      </article>
    </main>
  );
}
