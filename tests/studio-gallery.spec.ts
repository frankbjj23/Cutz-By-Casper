import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { haircutStyles } from "../lib/gallery";
import {
  beardStyleReferenceImages,
  hairStyleReferenceImages,
} from "../lib/style-preview";

const STUDIO_PREFIX = "/images/styles-studio-v1/";
const EDITING_DISCLOSURE = "Backgrounds and lighting digitally edited.";
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const NEW_STYLE_IDS = ["style-21", "style-22", "style-23", "style-24"];
const PROMO_STYLE_IDS = ["style-02", "style-15"];
const promoStyles = PROMO_STYLE_IDS.map((id) => haircutStyles.find((item) => item.id === id)!);

test("all 24 studio assets exist and the original client photos are retained", async () => {
  expect(haircutStyles).toHaveLength(24);
  expect(new Set(haircutStyles.map((item) => item.src)).size).toBe(24);
  expect(new Set(haircutStyles.map((item) => item.id)).size).toBe(24);
  expect(haircutStyles.slice(0, 4).map((item) => item.id)).toEqual(NEW_STYLE_IDS);
  expect(haircutStyles.slice(4).map((item) => item.id)).toEqual(
    Array.from({ length: 20 }, (_, index) => `style-${String(index + 1).padStart(2, "0")}`),
  );
  const manifest = JSON.parse(await readFile(
    path.join(process.cwd(), "docs", "studio-photography-2026-09-17.json"), "utf8",
  )) as { assets: { id: string; original: string; edited: string; originalSha256: string }[] };
  expect(manifest.assets.map((item) => item.id)).toEqual(NEW_STYLE_IDS);

  await Promise.all(
    haircutStyles.map(async (item) => {
      const styleNumber = Number(item.id.replace("style-", ""));
      expect(item.src).toMatch(/^\/images\/styles-studio-v1\/[\w-]+\.png$/);

      const studio = await readFile(path.join(process.cwd(), "public", item.src.slice(1)));
      expect(studio.subarray(0, 8), item.src).toEqual(PNG_SIGNATURE);

      const originalUrl = item.src.replace(STUDIO_PREFIX, "/images/styles/").replace(/\.png$/, ".jpg");
      const original = await readFile(path.join(process.cwd(), "public", originalUrl.slice(1)));
      if (styleNumber <= 20) {
        const sourceName = styleNumber === 1 ? "haricut-style-1.jpeg" : `haircut-style-${styleNumber}.jpg`;
        const source = await readFile(path.join(process.cwd(), "images", sourceName));
        expect(original, originalUrl).toEqual(source);
      } else {
        const record = manifest.assets.find((asset) => asset.id === item.id);
        expect(record).toBeDefined();
        expect(record?.original).toBe(`public${originalUrl}`);
        expect(record?.edited).toBe(`public${item.src}`);
        expect(createHash("sha256").update(original).digest("hex")).toBe(record?.originalSha256);
      }
      expect(original.subarray(0, 3)).toEqual(Buffer.from([255, 216, 255]));
    }),
  );
});

test("homepage and preview references consistently use the versioned studio photos", async () => {
  const gallerySources = new Set(haircutStyles.map((item) => item.src));
  const hairReferences = Object.values(hairStyleReferenceImages);
  const beardReferences = Object.values(beardStyleReferenceImages);
  expect(hairReferences).toHaveLength(7);
  expect(beardReferences).toHaveLength(4);
  for (const reference of [...hairReferences, ...beardReferences]) {
    expect(gallerySources.has(reference), reference).toBeTruthy();
    expect(reference).toMatch(/^\/images\/styles-studio-v1\/.+\.png$/);
  }

  const homepage = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  const promoSources = [...homepage.matchAll(/src="(\/images\/styles[^\"]+)"/g)].map((match) => match[1]);
  expect(promoSources).toEqual(promoStyles.map((item) => item.src));
  expect(homepage).not.toContain('src="/images/styles/');
});

test("studio gallery keeps image-only choices and displays whole portraits when expanded", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/styles");
  await expect(page.getByText(EDITING_DISCLOSURE, { exact: true })).toBeVisible();
  await expect(page.locator("button.group")).toHaveCount(24);

  for (const item of haircutStyles) {
    const button = page.getByRole("button", { name: `Open ${item.name}`, exact: true });
    await expect(button).toBeAttached();
    await expect(button).toHaveText("");
    await button.scrollIntoViewIfNeeded();
    const image = button.locator("img");
    await expect(image).toHaveAttribute("alt", "");
    expect(decodeURIComponent((await image.getAttribute("src")) ?? "")).toContain(item.src);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }

  const first = haircutStyles[0];
  const trigger = page.getByRole("button", { name: `Open ${first.name}`, exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `${first.name} expanded`, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: first.alt, exact: true })).toHaveCSS("object-fit", "contain");
  await expect(page.getByText(first.name, { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("homepage shows the studio photos and the same editing disclosure", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByText(EDITING_DISCLOSURE, { exact: true })).toBeVisible();
  await expect(page.locator("button.group")).toHaveCount(12);

  const promos = page.locator('[aria-label="Haircut and beard reference directions"] img');
  await expect(promos).toHaveCount(2);
  for (const [index, item] of promoStyles.entries()) {
    const image = promos.nth(index);
    await image.scrollIntoViewIfNeeded();
    expect(decodeURIComponent((await image.getAttribute("src")) ?? "")).toContain(item.src);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
});

test("new client photos lead the homepage and full gallery on desktop and mobile", async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/", "/styles"]) {
      await page.goto(route);
      const cards = page.locator("button.group");
      for (const [index, item] of haircutStyles.slice(0, 4).entries()) {
        const card = cards.nth(index);
        await expect(card).toHaveAttribute("aria-label", `Open ${item.name}`);
        await expect(card).toHaveText("");
        expect(decodeURIComponent((await card.locator("img").getAttribute("src")) ?? "")).toContain(item.src);
      }
    }
  }
});
