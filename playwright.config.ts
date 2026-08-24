import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    env: {
      OPENAI_API_KEY: "test-only-not-a-real-key",
      STYLE_PREVIEW_ACCESS_HASH:
        "6604e9dc7624088b6777607177dec1eb5868e3d659c519e6220e7ae67122a528",
      STYLE_PREVIEW_ALLOWED_ORIGIN: "http://127.0.0.1:3100",
      BOOKING_CONTACT_ALLOWED_ORIGIN: "http://127.0.0.1:3100",
      BOOKING_CONTACT_SUPABASE_URL: "http://127.0.0.1:3100",
      BOOKING_CONTACT_SUPABASE_PUBLISHABLE_KEY: "test-only-publishable-key",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
