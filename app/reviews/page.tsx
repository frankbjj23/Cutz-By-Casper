import type { Metadata } from "next";
import Link from "next/link";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import {
  BOOKSY_REVIEWS_URL,
  BRAND_OG_PATH,
  business,
  SITE_URL,
} from "@/lib/site";

const description =
  "Read how Redeemed Precision Grooming handles client reviews and send a moderated website review without leaving the site.";

export const metadata: Metadata = {
  title: "Client Reviews",
  description,
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: `Client Reviews | ${business.name}`,
    description,
    url: SITE_URL + "/reviews",
    siteName: business.name,
    images: [BRAND_OG_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: `Client Reviews | ${business.name}`,
    description,
    images: [BRAND_OG_PATH],
  },
};

export default function ReviewsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <section className="mx-auto max-w-3xl space-y-6 text-center">
        <p className="eyebrow">Your experience</p>
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-pearl sm:text-7xl">
          Leave a review,{" "}
          <span className="block italic text-gold">right here.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-8 text-pearl/60">
          Send your experience privately without opening Booksy. Frank or Casper will
          review it before it can appear on the Redeemed website.
        </p>
      </section>

      <div className="mt-14 grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
        <aside className="space-y-6 border border-white/10 bg-black/20 p-7 sm:p-9">
          <div>
            <p className="eyebrow">Clear labels</p>
            <h2 className="mt-4 font-display text-3xl text-pearl">Two honest sources.</h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-pearl/60">
            <p>
              <strong className="text-pearl">Confirmed Booksy client</strong> means the
              review is shown on Casper&apos;s Booksy profile and Booksy identifies the person
              as a confirmed client.
            </p>
            <p>
              <strong className="text-pearl">Redeemed website review</strong> means it was
              sent through this page and approved by staff. It is not a Booksy-verified
              review.
            </p>
          </div>
          <a
            href={BOOKSY_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button w-full"
          >
            View Current Booksy Reviews
          </a>
          <p className="text-xs leading-6 text-pearl/55">
            To add a confirmed review to Booksy itself, Booksy requires a completed
            Booksy appointment and handles that review inside its own service.
          </p>
        </aside>

        <ReviewSubmissionForm />
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/#reviews"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/65 underline decoration-gold underline-offset-8 transition hover:text-pearl"
        >
          Return to client experiences
        </Link>
      </div>
    </main>
  );
}
