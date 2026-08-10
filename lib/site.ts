export const SITE_URL = "https://cutz-by-casper-umri.vercel.app";
export const BOOKSY_URL =
  "https://booksy.com/en-us/697614_casper_barber-shop_28371_lyndhurst";
export const BOOKSY_PRIVACY_URL = "https://booksy.com/en-us/p/privacy";
export const OPENAI_DATA_CONTROLS_URL =
  "https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint";

export const business = {
  name: "Cutz By Casper",
  barberName: "Casper",
  description:
    "Refined barbering by Casper in Lyndhurst, New Jersey. Explore the work and reserve a live appointment through Booksy.",
  address: {
    street: "442 Ridge Rd",
    city: "Lyndhurst",
    region: "NJ",
    postalCode: "07071",
    country: "US",
  },
} as const;

export const addressDisplay =
  business.address.street +
  ", " +
  business.address.city +
  ", " +
  business.address.region +
  " " +
  business.address.postalCode;

export const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(addressDisplay);

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
