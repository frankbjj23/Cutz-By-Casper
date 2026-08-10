import "./globals.css";
import type { Metadata, Viewport } from "next";
import MobileBookingBar from "@/components/MobileBookingBar";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { BOOKSY_URL, business, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cutz By Casper | Refined Barbering in Lyndhurst, NJ",
    template: "%s | Cutz By Casper",
  },
  description: business.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: business.name,
    title: "Cutz By Casper | Refined Barbering in Lyndhurst, NJ",
    description: business.description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Cutz By Casper — barbering in Lyndhurst, New Jersey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cutz By Casper | Refined Barbering in Lyndhurst, NJ",
    description: business.description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0a0b",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: business.name,
  description: business.description,
  url: SITE_URL,
  image: SITE_URL + "/og.png",
  address: {
    "@type": "PostalAddress",
    streetAddress: business.address.street,
    addressLocality: business.address.city,
    addressRegion: business.address.region,
    postalCode: business.address.postalCode,
    addressCountry: business.address.country,
  },
  sameAs: [BOOKSY_URL],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="gradient-bg min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <a
          href="#main-content"
          className="sr-only z-50 border border-gold bg-ink px-4 py-2 text-pearl focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <MobileBookingBar />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
