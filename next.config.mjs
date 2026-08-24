/** @type {import('next').NextConfig} */
const bookingSupabaseUrl = process.env.NEXT_PUBLIC_BOOKING_SUPABASE_URL;
let bookingSupabaseOrigin = "";
try {
  bookingSupabaseOrigin = bookingSupabaseUrl
    ? new URL(bookingSupabaseUrl).origin
    : "";
} catch {
  bookingSupabaseOrigin = "";
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self' https://booksy.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline' https://booksy.com",
      "script-src 'self' 'unsafe-inline' https://booksy.com",
      `connect-src 'self'${bookingSupabaseOrigin ? ` ${bookingSupabaseOrigin}` : ""}`,
      "frame-src 'self' https://booksy.com",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "cutz-by-casper-umri.vercel.app" }],
        destination: "https://redeemedbycasper.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    const privatePreviewHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/preview", headers: privatePreviewHeaders },
      { source: "/api/style-preview", headers: privatePreviewHeaders },
      { source: "/api/booking-contact", headers: privatePreviewHeaders },
      { source: "/admin/:path*", headers: privatePreviewHeaders },
      { source: "/auth/:path*", headers: privatePreviewHeaders },
    ];
  },
};

export default nextConfig;
