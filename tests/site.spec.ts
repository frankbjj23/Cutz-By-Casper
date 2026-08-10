import { expect, test } from "@playwright/test";

const BOOKSY_URL =
  "https://booksy.com/en-us/697614_casper_barber-shop_28371_lyndhurst";

test("customer routes render without custom booking forms", async ({ page }) => {
  for (const path of ["/", "/styles", "/book", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
  }
});

test("all Booksy booking links use Casper's canonical profile", async ({ page }) => {
  for (const path of ["/", "/styles", "/book"]) {
    await page.goto(path);
    const bookingLinks = page.locator('a[href*="booksy.com/en-us/697614"]');
    expect(await bookingLinks.count()).toBeGreaterThan(0);

    for (const link of await bookingLinks.all()) {
      await expect(link).toHaveAttribute("href", BOOKSY_URL);
    }
  }

  await page.goto("/book");
  await expect(page.getByRole("link", { name: "Booksy privacy notice" })).toHaveAttribute(
    "href",
    "https://booksy.com/en-us/p/privacy",
  );
});

test("retired API routes return not found", async ({ request }) => {
  for (const path of [
    "/api/services",
    "/api/availability",
    "/api/demo",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});

test("private style preview stays unlisted and unlocks with a valid invitation", async ({
  page,
  request,
}) => {
  await page.goto("/preview");
  await expect(page.getByRole("heading", { name: /see the direction/i })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  await page.getByLabel("Invitation code").fill("test-preview-code");
  await page.getByRole("button", { name: "Enter private preview" }).click();
  await expect(page.getByRole("heading", { name: /choose one considered direction/i })).toBeVisible();
  const consent = page.getByLabel(/i am 18 or older/i);
  await expect(consent).toBeDisabled();
  await expect(consent).not.toBeChecked();
  await expect(page.getByLabel("Choose a photo")).toHaveAttribute(
    "accept",
    "image/jpeg,image/png,image/webp",
  );
  await expect(page.getByRole("link", { name: "Reserve on Booksy" })).toHaveAttribute(
    "href",
    BOOKSY_URL,
  );

  await page
    .getByLabel("Choose a photo")
    .setInputFiles("public/images/casper/casper-signature-portrait.png");
  await expect(
    page.getByAltText("Prepared portrait selected for the private style preview"),
  ).toBeVisible();
  await expect(consent).toBeEnabled();
  await consent.check();
  await page
    .locator("#style-preview-photo")
    .setInputFiles("public/images/styles/01-low-fade.jpg");
  await expect(
    page.getByAltText("Prepared portrait selected for the private style preview"),
  ).toBeVisible();
  await expect(consent).not.toBeChecked();
  await page.getByRole("button", { name: /preview low taper/i }).click();
  await expect(
    page.getByText("Confirm the adult self-photo consent before creating a preview."),
  ).toBeVisible();

  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("/preview");

  await page.goto("/");
  await expect(page.locator('a[href="/preview"]')).toHaveCount(0);
});

test("style preview API rejects unauthorized and malformed requests without generation", async ({
  request,
}) => {
  const endpoint = "/api/style-preview";
  const origin = "http://127.0.0.1:3100";

  const wrongOrigin = await request.post(endpoint, {
    headers: {
      Origin: "https://example.com",
      Authorization: "Bearer test-preview-code",
      "x-preview-intent": "verify",
    },
  });
  expect(wrongOrigin.status()).toBe(403);
  expect(wrongOrigin.headers()["cache-control"]).toContain("no-store");

  const wrongCode = await request.post(endpoint, {
    headers: {
      Origin: origin,
      Authorization: "Bearer wrong-code",
      "x-preview-intent": "verify",
    },
  });
  expect(wrongCode.status()).toBe(401);

  const verified = await request.post(endpoint, {
    headers: {
      Origin: origin,
      Authorization: "Bearer test-preview-code",
      "x-preview-intent": "verify",
    },
  });
  expect(verified.status()).toBe(204);
  expect(verified.headers()["x-preview-provider"]).toBe("configured");

  const wrongContentType = await request.post(endpoint, {
    headers: {
      Origin: origin,
      Authorization: "Bearer test-preview-code",
      "Content-Type": "application/json",
    },
    data: {},
  });
  expect(wrongContentType.status()).toBe(415);

  const missingConsent = await request.post(endpoint, {
    headers: {
      Origin: origin,
      Authorization: "Bearer test-preview-code",
    },
    multipart: {
      hairStyle: "low-taper-curls",
      hairColor: "keep-current",
      beardStyle: "keep-current",
    },
  });
  expect(missingConsent.status()).toBe(400);
  expect((await missingConsent.json()).error.code).toBe("CONSENT_REQUIRED");

  const unknownPreset = await request.post(endpoint, {
    headers: {
      Origin: origin,
      Authorization: "Bearer test-preview-code",
    },
    multipart: {
      consent: "true",
      consentVersion: "2026-08-10-v1",
      hairStyle: "browser-supplied-prompt",
      hairColor: "keep-current",
      beardStyle: "keep-current",
    },
  });
  expect(unknownPreset.status()).toBe(400);
  expect((await unknownPreset.json()).error.code).toBe("INVALID_SELECTION");

  const combinedChanges = await request.post(endpoint, {
    headers: {
      Origin: origin,
      Authorization: "Bearer test-preview-code",
    },
    multipart: {
      consent: "true",
      consentVersion: "2026-08-10-v1",
      hairStyle: "low-taper-curls",
      hairColor: "natural-black",
      beardStyle: "short-boxed",
    },
  });
  expect(combinedChanges.status()).toBe(400);
  expect((await combinedChanges.json()).error.code).toBe("ONE_CHANGE_ONLY");

  const spoofedPhoto = await request.post(endpoint, {
    headers: {
      Origin: origin,
      Authorization: "Bearer test-preview-code",
    },
    multipart: {
      consent: "true",
      consentVersion: "2026-08-10-v1",
      hairStyle: "low-taper-curls",
      hairColor: "keep-current",
      beardStyle: "keep-current",
      photo: {
        name: "portrait.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.alloc(12 * 1024),
      },
    },
  });
  expect(spoofedPhoto.status()).toBe(415);
  expect((await spoofedPhoto.json()).error.code).toBe("PHOTO_INVALID");

  const getResponse = await request.get(endpoint);
  expect(getResponse.status()).toBe(405);
});

test("SEO discovery files and page-specific social metadata are present", async ({
  page,
  request,
}) => {
  const siteUrl = "https://cutz-by-casper-umri.vercel.app";
  for (const path of ["/", "/styles", "/book", "/privacy"]) {
    const pageUrl = path === "/" ? siteUrl : siteUrl + path;
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", pageUrl);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", pageUrl);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      siteUrl + "/og.png",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      siteUrl + "/og.png",
    );
  }

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("/book");
});

test("mobile layout has no horizontal overflow and keeps booking visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /view live availability/i })).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBeFalsy();
});

test("private preview fits mobile and suppresses the competing booking bar", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/preview");
  await page.getByLabel("Invitation code").fill("test-preview-code");
  await page.getByRole("button", { name: "Enter private preview" }).click();
  await expect(page.getByRole("heading", { name: /choose one considered direction/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /view live availability/i })).toHaveCount(0);

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBeFalsy();
});

test("gallery lightbox locks page scroll and restores trigger focus", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/styles");

  const trigger = page.locator("button.group").first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("hidden");

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 400);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
