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
    <main id="main-content" className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
      <article className="lux-card space-y-8 p-7 sm:p-10">
        <header className="space-y-3">
          <p className="eyebrow">Effective August 10, 2026</p>
          <h1 className="font-display text-4xl sm:text-5xl">Privacy</h1>
          <p className="text-sm leading-6 text-ink/70">
            This page explains the boundary between this informational website and Casper&apos;s
            third-party booking system.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">This website</h2>
          <p className="text-sm leading-7 text-ink/70">
            This site does not offer user accounts or an on-site booking form. We do not ask
            you to submit booking, payment, or health information here. The hosting provider
            may process limited technical information needed to deliver and secure the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Booksy bookings</h2>
          <p className="text-sm leading-7 text-ink/70">
            Booking links take you to Casper&apos;s profile on Booksy. Booksy processes the
            information you enter there under its own terms and privacy practices. Review
            the{" "}
            <a
              href={BOOKSY_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4"
            >
              Booksy Privacy Notice
            </a>{" "}
            before submitting information, or go directly to the{" "}
            <a
              href={BOOKSY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4"
            >
              Booksy booking profile
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Questions</h2>
          <p className="text-sm leading-7 text-ink/70">
            For information submitted through Booksy, contact Booksy through its published
            support and privacy channels.
          </p>
        </section>
      </article>
    </main>
  );
}
