import type { Metadata } from "next";
import { BOOKSY_PRIVACY_URL, BOOKSY_URL, SITE_URL } from "@/lib/site";

const description =
  "Privacy information for the Cutz By Casper website and Booksy booking link.";

export const metadata: Metadata = {
  title: "Privacy",
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy | Cutz By Casper",
    description,
    url: SITE_URL + "/privacy",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy | Cutz By Casper",
    description,
    images: ["/og.png"],
  },
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-4xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <article className="lux-card space-y-10 p-7 sm:p-12">
        <header className="space-y-5 border-b border-white/10 pb-10">
          <p className="eyebrow">Effective August 10, 2026</p>
          <h1 className="font-display text-5xl text-pearl sm:text-7xl">Privacy</h1>
          <p className="max-w-2xl text-sm leading-7 text-pearl/60">
            This page explains the boundary between this informational website and Casper&apos;s
            third-party booking system.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-2xl text-pearl">This website</h2>
          <p className="text-sm leading-7 text-pearl/60">
            This site does not offer user accounts or an on-site booking form. We do not ask
            you to submit booking, payment, or health information here. The hosting provider
            may process limited technical information needed to deliver and secure the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl text-pearl">Booksy bookings</h2>
          <p className="text-sm leading-7 text-pearl/60">
            Booking links take you to Casper&apos;s profile on Booksy. Booksy processes the
            information you enter there under its own terms and privacy practices. Review
            the{" "}
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
            support and privacy channels.
          </p>
        </section>
      </article>
    </main>
  );
}
