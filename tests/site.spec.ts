import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const BOOKSY_URL = "https://booksy.com/en-us/dl/show-business/697614";
const BRAND_NAME = "Redeemed Precision Grooming";

test("general customer routes render without unrelated forms", async ({ page }) => {
  for (const path of ["/", "/styles", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page).toHaveTitle(new RegExp(BRAND_NAME));
  }
});

test("new brand identity and Booksy transition are clear", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: `${BRAND_NAME} home` }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /precision with purpose/i })).toBeVisible();
  await expect(page.getByText(/with 30 years in the industry/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Ridgefield, New Jersey/i }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("442 Ridge Rd");
  await expect(page.locator("body")).not.toContainText("Cutz By Casper");

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await skipLink.click();
  await expect(page.locator("main")).toBeFocused();

  await page.goto("/book");
  await expect(
    page.getByText(/save your contact details on this site/i),
  ).toBeVisible();
});

test("primary booking links use the website handoff and direct Booksy links stay canonical", async ({ page }) => {
  for (const path of ["/", "/styles"]) {
    await page.goto(path);
    expect(await page.locator('a[href="/book"]').count()).toBeGreaterThan(0);
  }

  await page.goto("/book");
  await expect(
    page.getByRole("link", { name: /continue directly to Booksy without saving/i }),
  ).toHaveAttribute("href", BOOKSY_URL);
  await expect(page.getByRole("link", { name: "Booksy privacy notice" })).toHaveAttribute(
    "href",
    "https://booksy.com/en-us/p/privacy",
  );
});

test("booking contact form validates consent and fails open to Booksy when storage is unavailable", async ({
  page,
  request,
}) => {
  await page.goto("/book");
  const form = page.getByRole("button", { name: "Save & Continue to Booksy" });
  await expect(form).toBeVisible();
  await page.getByLabel("Full name").fill("Website Test Guest");
  await page.getByLabel(/Mobile number/).fill("201-555-0123");
  await page.getByLabel(/I agree that Redeemed Precision Grooming/i).check();
  await form.click();
  await expect(page.locator('p[role="alert"]')).toContainText(/temporarily unavailable/i);
  await expect(
    page.getByRole("link", { name: /continue directly to Booksy without saving/i }),
  ).toHaveAttribute("href", BOOKSY_URL);

  const wrongOrigin = await request.post("/api/booking-contact", {
    headers: { Origin: "https://example.com", "Content-Type": "application/json" },
    data: {},
  });
  expect(wrongOrigin.status()).toBe(403);

  const wrongContentType = await request.post("/api/booking-contact", {
    headers: { Origin: "http://127.0.0.1:3100", "Content-Type": "text/plain" },
    data: "not json",
  });
  expect(wrongContentType.status()).toBe(415);

  const invalidContact = await request.post("/api/booking-contact", {
    headers: { Origin: "http://127.0.0.1:3100", "Content-Type": "application/json" },
    data: {
      fullName: "A",
      consent: true,
      consentVersion: "2026-08-24-v1",
    },
  });
  expect(invalidContact.status()).toBe(400);

  const getResponse = await request.get("/api/booking-contact");
  expect(getResponse.status()).toBe(405);
});

test("a saved website contact opens Casper's official Booksy widget without leaving the site", async ({
  page,
}) => {
  let widgetRequestUrl = "";
  await page.route("**/api/booking-contact", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route("https://booksy.com/widget/code.js?**", async (route) => {
    widgetRequestUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `(() => {
        const currentScript = [...document.scripts].find((script) => script.src.includes("/widget/code.js"));
        const container = document.createElement("div");
        container.className = "booksy-widget-container";
        const button = document.createElement("div");
        button.className = "booksy-widget-button";
        button.addEventListener("click", () => {
          const count = Number(document.body.dataset.booksyOpened || "0") + 1;
          document.body.dataset.booksyOpened = String(count);
        });
        container.appendChild(button);
        currentScript?.parentNode?.insertBefore(container, currentScript);
      })();`,
    });
  });

  await page.goto("/book");
  await page.getByLabel("Full name").fill("Widget Test Guest");
  await page.getByLabel(/Email/).fill("widget-test@example.com");
  await page.getByLabel(/I agree that Redeemed Precision Grooming/i).check();
  await page.getByRole("button", { name: "Save & Continue to Booksy" }).click();

  await expect(page.getByRole("button", { name: "Open Live Booking Calendar" })).toBeEnabled();
  await expect.poll(() => page.locator("body").getAttribute("data-booksy-opened")).toBe("1");
  const widgetUrl = new URL(widgetRequestUrl);
  expect(widgetUrl.searchParams.get("id")).toBe("697614");
  expect(widgetUrl.searchParams.get("country")).toBe("us");
  expect(widgetUrl.searchParams.get("lang")).toBe("en-US");
  expect(new URL(page.url()).pathname).toBe("/book");

  await page.getByRole("button", { name: "Open Live Booking Calendar" }).click();
  await expect.poll(() => page.locator("body").getAttribute("data-booksy-opened")).toBe("2");
  await expect(page.getByRole("link", { name: "Open Booksy in a new tab" })).toHaveAttribute(
    "href",
    BOOKSY_URL,
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

test("custom booking admin stays private and fails closed without database configuration", async ({
  page,
  request,
}) => {
  const adminResponse = await request.get("/admin", { maxRedirects: 0 });
  expect(adminResponse.status()).toBe(307);
  expect(adminResponse.headers().location).toBe("/admin/login");

  const loginResponse = await request.get("/admin/login");
  expect(loginResponse.ok()).toBeTruthy();
  expect(loginResponse.headers()["cache-control"]).toContain("no-store");
  expect(loginResponse.headers()["x-robots-tag"]).toContain("noindex");
  expect(loginResponse.headers()["x-frame-options"]).toBe("DENY");

  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Casper's sign in" })).toBeVisible();
  await expect(page.getByText(/has not been added to this environment/i)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: /reserve on Booksy/i })).toHaveCount(0);

  const invitationResponse = await request.get("/admin/accept-invite");
  expect(invitationResponse.ok()).toBeTruthy();
  expect(invitationResponse.headers()["cache-control"]).toContain("no-store");

  await page.goto("/admin/accept-invite");
  await expect(
    page.getByRole("heading", { name: "Set your private password" }),
  ).toBeVisible();
  await expect(page.getByText(/no password can be created here yet/i)).toBeVisible();

  const ownerAccessResponse = await request.get("/admin/owner-access");
  expect(ownerAccessResponse.ok()).toBeTruthy();
  expect(ownerAccessResponse.headers()["cache-control"]).toContain("no-store");

  await page.goto("/admin/owner-access");
  await expect(
    page.getByRole("heading", { name: "Use a code, not an email link" }),
  ).toBeVisible();
  await expect(page.getByText(/no owner code can be requested here yet/i)).toBeVisible();

  const invalidConfirmation = await request.get("/auth/confirm", {
    maxRedirects: 0,
  });
  expect(invalidConfirmation.status()).toBe(307);
  const confirmationRedirect = new URL(invalidConfirmation.headers().location!);
  expect(confirmationRedirect.pathname + confirmationRedirect.search).toBe(
    "/admin/owner-access",
  );
});

test("public routes send browser security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain(
    "script-src 'self' 'unsafe-inline' https://booksy.com",
  );
  expect(headers["content-security-policy"]).toContain(
    "frame-src 'self' https://booksy.com",
  );
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
});

test("private style preview stays gated and unlocks with a valid invitation", async ({
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
  await expect(page.locator("main").getByRole("link", { name: "Start Booking", exact: true })).toHaveAttribute(
    "href",
    "/book",
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
  await expect(
    page.getByRole("link", { name: "Enter the Private Preview" }),
  ).toHaveAttribute("href", "/preview");
});

test("private preview renders visual directions and a complete mocked result flow", async ({
  page,
}) => {
  const previewJpeg = await readFile("public/images/styles/15-textured-quiff.jpg");
  await page.route("**/api/style-preview", async (route) => {
    if (route.request().headers()["x-preview-intent"] === "verify") {
      await route.fulfill({
        status: 204,
        headers: { "X-Preview-Provider": "configured" },
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "image/jpeg",
      body: previewJpeg,
      headers: { "Cache-Control": "private, no-store" },
    });
  });

  await page.goto("/preview");
  await page.getByLabel("Invitation code").fill("test-preview-code");
  await page.getByRole("button", { name: "Enter private preview" }).click();

  const haircutReferences = page.locator('label img[alt=""]');
  await expect.poll(async () => haircutReferences.count()).toBeGreaterThan(0);
  await expect
    .poll(() =>
      haircutReferences.evaluateAll((images) =>
        images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
      ),
    )
    .toBeTruthy();

  await page
    .getByRole("radio", { name: /Beard Length, outline, and balance/i })
    .check({ force: true });
  await page.getByRole("radio", { name: /Short boxed beard/i }).check({ force: true });
  await expect(
    page.getByRole("button", { name: "Preview Short boxed beard" }),
  ).toBeVisible();

  await page
    .getByLabel("Choose a photo")
    .setInputFiles("public/images/casper/casper-signature-portrait.png");
  await page.getByLabel(/i am 18 or older/i).check();
  await page.getByRole("button", { name: "Preview Short boxed beard" }).click();

  await expect(page.getByRole("heading", { name: "Your selected direction" })).toBeFocused();
  await expect(page.getByAltText("AI preview showing Short boxed beard")).toBeVisible();
  await page.getByRole("button", { name: "Yes — keep it" }).click();
  await expect(
    page.getByRole("complementary").getByRole("link", { name: "Start Booking" }),
  ).toHaveAttribute("href", "/book");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download look card" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /redeemed-precision-(look-card|style-preview)\.jpg/,
  );

  await page.getByRole("button", { name: "Delete photo and preview" }).click();
  await expect(page.getByAltText("AI preview showing Short boxed beard")).toHaveCount(0);
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
      consentVersion: "2026-08-10-v2",
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
      consentVersion: "2026-08-10-v2",
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
      consentVersion: "2026-08-10-v2",
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
  const siteUrl = "https://redeemedbycasper.com";
  for (const path of ["/", "/styles", "/book", "/privacy", "/preview"]) {
    const pageUrl = path === "/" ? siteUrl : siteUrl + path;
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", pageUrl);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", pageUrl);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      BRAND_NAME,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      new RegExp(BRAND_NAME),
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      new RegExp(BRAND_NAME),
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      siteUrl + "/redeemed-casper-og-v2.jpg",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      siteUrl + "/redeemed-casper-og-v2.jpg",
    );
  }

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("/sitemap.xml");
  expect(robotsText).toContain("Disallow: /admin");
  expect(robotsText).toContain("Disallow: /api");
  expect(robotsText).toContain("Disallow: /auth");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("/book");

  const favicon = await request.get("/icon.jpg");
  expect(favicon.ok()).toBeTruthy();
  expect(favicon.headers()["content-type"]).toContain("image/jpeg");

  await page.goto("/");
  const structuredData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
  );
  expect(structuredData.name).toBe(BRAND_NAME);
  expect(structuredData.alternateName).toBeUndefined();
  expect(JSON.stringify(structuredData)).not.toContain("Cutz By Casper");
  expect(structuredData.logo).toBe(
    siteUrl + "/images/brand/redeemed-precision-logo.jpg",
  );
  expect(structuredData.employee).toMatchObject({
    "@type": "Person",
    name: "Casper",
  });
  expect(structuredData.employee.sameAs).toBeUndefined();
  expect(structuredData.address).toMatchObject({
    streetAddress: "719 Grand Ave",
    addressLocality: "Ridgefield",
    addressRegion: "NJ",
    postalCode: "07657",
  });

  const brandAssets = await page.evaluate(async () => {
    const load = (src: string) =>
      new Promise<{ height: number; width: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
        image.onerror = () => reject(new Error(`Could not load ${src}`));
        image.src = src;
      });
    return {
      mark: await load("/images/brand/redeemed-mark.jpg"),
      social: await load("/redeemed-casper-og-v2.jpg"),
    };
  });
  expect(brandAssets.mark).toEqual({ height: 512, width: 512 });
  expect(brandAssets.social).toEqual({ height: 630, width: 1200 });
});

test("mobile layout has no horizontal overflow and keeps booking visible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: `${BRAND_NAME} home` })).toBeVisible();
  await expect(page.getByRole("link", { name: /view live availability and start booking/i })).toBeVisible();

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
  await expect(page.getByRole("link", { name: /view live availability and start booking/i })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /Haircut Shape, blend, and finish/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Beard Length, outline, and balance/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Hair color Concept color only/i })).toBeVisible();

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
