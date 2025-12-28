export const DEMO_MODE = process.env.DEMO_MODE === "true";

export const HAS_STRIPE = Boolean(process.env.STRIPE_SECRET_KEY);

export const HAS_TWILIO = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
);
