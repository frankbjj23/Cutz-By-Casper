import type { Metadata } from "next";
import Link from "next/link";
import StylePreviewStudio from "@/components/StylePreviewStudio";
import { BRAND_OG_PATH, business, SITE_URL } from "@/lib/site";

const description =
  `Invitation-only virtual hair, beard, and color consultation for ${business.name}.`;

export const metadata: Metadata = {
  title: "Private Style Preview",
  description,
  alternates: {
    canonical: "/preview",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  openGraph: {
    title: `Private Style Preview | ${business.name}`,
    description,
    url: SITE_URL + "/preview",
    siteName: business.name,
    images: [BRAND_OG_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: `Private Style Preview | ${business.name}`,
    description,
    images: [BRAND_OG_PATH],
  },
};

export default function PreviewPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-5 pb-24 pt-12 sm:px-8 sm:pt-20">
      <StylePreviewStudio />

      <section
        className="light-panel mt-14 grid gap-8 p-7 sm:p-10 lg:grid-cols-[0.72fr_1.28fr]"
        aria-labelledby="photo-handling-heading"
      >
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-ink/65">
            Preview privacy
          </p>
          <h2 id="photo-handling-heading" className="mt-4 font-display text-4xl text-ink">
            How your photo is handled
          </h2>
        </div>
        <dl className="grid gap-6 text-sm leading-7 text-ink/70 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-ink">Purpose</dt>
            <dd>Used only to create the single preview you request.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Site storage</dt>
            <dd>Processed in memory; not saved to a gallery, database, or marketing library.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Provider</dt>
            <dd>OpenAI processes the image and may retain safety logs for up to 30 days.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Booking</dt>
            <dd>No photo or preview is transferred to Booksy.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Identity</dt>
            <dd>No facial-recognition database, identity matching, or sensitive-trait inference.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Control</dt>
            <dd>
              Delete clears this browser&apos;s copy. Read the complete{" "}
              <Link href="/privacy#style-preview" className="font-semibold underline decoration-gold underline-offset-4">
                preview privacy notice
              </Link>
              .
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
