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
