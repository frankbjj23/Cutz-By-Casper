const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "NEXT_PUBLIC_BASE_URL",
  "OPENAI_API_KEY"
];

const missing = requiredKeys.filter((key) => !process.env[key]);

if (missing.length === 0) {
  console.log("All required environment variables are set.");
  process.exit(0);
}

console.log("Missing environment variables:");
for (const key of missing) {
  console.log(`- ${key}`);
}
process.exit(1);
