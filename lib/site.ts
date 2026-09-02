export const SITE_URL = "https://redeemedbycasper.com";
export const BRAND_LOGO_PATH = "/images/brand/redeemed-precision-logo.jpg";
export const BRAND_MARK_PATH = "/images/brand/redeemed-mark.jpg";
export const BRAND_OG_PATH = "/redeemed-casper-og-v2.jpg";
export const BOOKSY_URL = "https://booksy.com/en-us/dl/show-business/697614";
export const BOOKSY_REVIEWS_URL =
  "https://booksy.com/en-us/697614_casper_barber-shop_28387_ridgefield#reviews";
export const BOOKSY_WIDGET_URL =
  "https://booksy.com/widget/code.js?id=697614&country=us&lang=en-US";
export const BOOKSY_PRIVACY_URL = "https://booksy.com/en-us/p/privacy";
export const OPENAI_DATA_CONTROLS_URL =
  "https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint";

export const business = {
  name: "Redeemed Precision Grooming",
  descriptor: "Premium Barbering",
  barberName: "Casper",
  description:
    "Premium barbering by Casper in Ridgefield, New Jersey, informed by 30 years in the industry and a commitment to professionalism and client-first service.",
  bio:
    "With 30 years in the industry, Casper brings an old-school belief that the client comes first. His approach is grounded in faith, professionalism, genuine relationships, and a deep passion for helping people feel better about themselves.",
  address: {
    street: "719 Grand Ave",
    city: "Ridgefield",
    region: "NJ",
    postalCode: "07657",
    country: "US",
  },
} as const;

export const locationDisplay = `${business.address.street}, ${business.address.city}, ${business.address.region} ${business.address.postalCode}`;

export const serviceCategories = [
  {
    name: "Precision Haircuts",
    description: "Fades, tapers, texture, and line work shaped into one considered finish.",
  },
  {
    name: "Haircut & Beard",
    description: "A coordinated haircut, beard blend, and detailed finish with balanced proportions.",
  },
  {
    name: "Beard Work & Shape-Ups",
    description: "Focused beard grooming, shape-ups, and edge work between full appointments.",
  },
] as const;
