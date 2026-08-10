export const SITE_URL = "https://cutz-by-casper-umri.vercel.app";
export const BOOKSY_URL =
  "https://booksy.com/en-us/697614_casper_barber-shop_28371_lyndhurst";
export const BOOKSY_PRIVACY_URL = "https://booksy.com/en-us/p/privacy";

export const business = {
  name: "Cutz By Casper",
  barberName: "Casper",
  description:
    "Explore Casper's barbering work and book live appointments through Booksy in Lyndhurst, New Jersey.",
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
    name: "Precision haircuts",
    description: "Fades, tapers, textured styles, and clean line-ups.",
  },
  {
    name: "Haircut and beard",
    description: "A coordinated cut, beard blend, and detailed finish.",
  },
  {
    name: "Beard work and shape-ups",
    description: "Focused grooming and edge work between full cuts.",
  },
] as const;
