/** @type {import('next').NextConfig} */
const nextConfig = {
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
      { source: "/preview", headers: privatePreviewHeaders },
      { source: "/api/style-preview", headers: privatePreviewHeaders },
    ];
  },
};

export default nextConfig;
