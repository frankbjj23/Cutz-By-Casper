import { expect, test } from "@playwright/test";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, BOOKSY_BOOKING_URL } from "../lib/site";

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  for (const path of ["/", "/styles"]) {
    test(`Instagram is accessible on ${path} at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const instagramRequests: string[] = [];
      page.on("request", (request) => {
        if (/instagram\.com|cdninstagram\.com/.test(request.url())) {
          instagramRequests.push(request.url());
        }
      });
      await page.goto(path);
      const callout = page.getByRole("complementary", { name: "Follow Casper on Instagram" });
      await expect(callout).toBeVisible();
      await expect(callout).toContainText(INSTAGRAM_HANDLE);
      const follow = callout.getByRole("link", { name: /follow on Instagram/i });
      await expect(follow).toHaveAttribute("href", INSTAGRAM_URL);
      await expect(follow).toHaveAttribute("target", "_blank");
      await expect(follow).toHaveAttribute("rel", "noopener noreferrer");
      await follow.focus();
      await expect(follow).toBeFocused();
      await expect(page.locator("footer").getByRole("link", { name: /Instagram @redeemedbycasper/ }))
        .toHaveAttribute("href", INSTAGRAM_URL);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      expect(instagramRequests).toEqual([]);
    });
  }
}

test("Instagram metadata preserves Booksy and does not add embedded tracking", async ({ page }) => {
  await page.goto("/");
  const structuredData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
  );
  expect(structuredData.sameAs).toEqual([BOOKSY_BOOKING_URL, INSTAGRAM_URL]);
  expect(structuredData.employee.sameAs).toBeUndefined();
  await expect(page.locator('script[src*="instagram"], iframe[src*="instagram"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start booking an appointment", exact: true }))
    .toHaveAttribute("href", "/book");
  await page.goto("/book");
  await expect(page.locator("footer").getByRole("link", { name: /Instagram @redeemedbycasper/ }))
    .toHaveAttribute("href", INSTAGRAM_URL);
});
