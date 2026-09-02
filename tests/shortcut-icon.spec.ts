import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import sharp from "sharp";

test("Apple shortcut icon is opaque and visually centered", async () => {
  const iconPath = resolve("app/apple-icon.png");
  const metadata = await sharp(iconPath).metadata();

  expect(metadata).toMatchObject({
    width: 180,
    height: 180,
    format: "png",
    hasAlpha: false,
  });

  const { data, info } = await sharp(iconPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = {
    left: info.width,
    top: info.height,
    right: -1,
    bottom: -1,
  };

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 3;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const luminance = (red + green + blue) / 3;
      const isVisibleGold =
        luminance > 20 && red > blue * 1.15 && green > blue * 1.05;

      if (isVisibleGold) {
        bounds.left = Math.min(bounds.left, x);
        bounds.top = Math.min(bounds.top, y);
        bounds.right = Math.max(bounds.right, x);
        bounds.bottom = Math.max(bounds.bottom, y);
      }
    }
  }

  expect(bounds.right).toBeGreaterThan(bounds.left);
  expect(bounds.bottom).toBeGreaterThan(bounds.top);

  const margins = {
    left: bounds.left,
    top: bounds.top,
    right: info.width - 1 - bounds.right,
    bottom: info.height - 1 - bounds.bottom,
  };

  expect(Math.min(...Object.values(margins))).toBeGreaterThanOrEqual(16);
  expect(Math.abs(margins.left - margins.right)).toBeLessThanOrEqual(2);
  expect(Math.abs(margins.top - margins.bottom)).toBeLessThanOrEqual(2);
});
