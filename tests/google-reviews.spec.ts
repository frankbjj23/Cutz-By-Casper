import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GoogleReviewInvitation from "../components/GoogleReviewInvitation";
import { normalizeGoogleReviewUrl } from "../lib/google-reviews";

const TEST_REVIEW_URL = "https://g.page/r/test-profile-not-a-real-business/review";

test("Google review links are disabled until a review composer is configured", () => {
  for (const value of [undefined, "", "  ", "not a url"]) {
    expect(normalizeGoogleReviewUrl(value)).toBeNull();
  }
  expect(renderToStaticMarkup(createElement(GoogleReviewInvitation, { reviewUrl: "" }))).toBe("");
});

test("only direct Google review links are accepted without tracking parameters", () => {
  expect(normalizeGoogleReviewUrl(` ${TEST_REVIEW_URL}/?utm_source=test#fragment `)).toBe(TEST_REVIEW_URL);
  expect(normalizeGoogleReviewUrl("https://g.page/test-business/review")).toBe(
    "https://g.page/test-business/review",
  );
  expect(normalizeGoogleReviewUrl("https://search.google.com/local/writereview?placeid=ChIJ_test-id&tracking=unused")).toBe(
    "https://search.google.com/local/writereview?placeid=ChIJ_test-id",
  );
});

test("untrusted hosts, credentials, insecure URLs and general searches stay hidden", () => {
  for (const value of [
    "javascript:alert(1)",
    "http://g.page/r/test/review",
    "https://g.page.evil.example/r/test/review",
    "https://g.page@evil.example/r/test/review",
    "https://user:password@g.page/r/test/review",
    "https://g.page:8443/r/test/review",
    "https://g.page/r/test",
    "https://google.com/search?q=Casper",
    "https://maps.app.goo.gl/unconfirmed-profile",
    "https://search.google.com/local/writereview",
    "https://search.google.com/local/writereview?placeid=bad%2Fid",
  ]) {
    expect(normalizeGoogleReviewUrl(value), value).toBeNull();
  }
});

test("configured invitation has accessible links and clear source information", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(renderToStaticMarkup(createElement(GoogleReviewInvitation, { reviewUrl: TEST_REVIEW_URL })));
  const link = page.getByRole("link", { name: /Review Us on Google/ });
  await expect(link).toHaveAttribute("href", TEST_REVIEW_URL);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText(/sign in to your Google account/)).toBeVisible();
  await expect(page.getByText(/does not post it to Google or Booksy/)).toBeVisible();
  await expect(page.locator("form, iframe, script, img")).toHaveCount(0);
});

test("Google link mode preserves website reviews without background provider requests", async ({ page }) => {
  const googleRequests: string[] = [];
  page.on("request", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (/(^|\.)(google\.com|googleapis\.com|g\.page)$/.test(hostname)) {
      googleRequests.push(request.url());
    }
  });
  for (const path of ["/", "/reviews"]) {
    await page.goto(path);
    const invitation = page.getByRole("link", { name: /Review Us on Google/ });
    // Production builds can be configured or unconfigured. The pure rendering
    // test above separately verifies that missing configuration renders nothing.
    expect(await invitation.count()).toBeLessThanOrEqual(1);
    if (await invitation.count()) {
      const href = await invitation.getAttribute("href");
      expect(normalizeGoogleReviewUrl(href ?? undefined)).toBe(href);
      await expect(invitation).toHaveAttribute("target", "_blank");
    }
  }
  await expect(page.getByRole("button", { name: "Send Review for Approval" })).toBeVisible();
  expect(googleRequests).toEqual([]);
});
