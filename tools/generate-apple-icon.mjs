import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ICON_SIZE = 180;
const SAFE_PADDING = 18;
const ALPHA_TRIM_THRESHOLD = 16;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(repositoryRoot, "app/icon.jpg");
const outputPath = resolve(repositoryRoot, "app/apple-icon.png");

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

const source = await sharp(sourcePath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const markPixels = Buffer.alloc(source.info.width * source.info.height * 4);
const markBounds = {
  left: source.info.width,
  top: source.info.height,
  right: -1,
  bottom: -1,
};

for (let sourceIndex = 0, markIndex = 0; sourceIndex < source.data.length; sourceIndex += 3, markIndex += 4) {
  const red = source.data[sourceIndex];
  const green = source.data[sourceIndex + 1];
  const blue = source.data[sourceIndex + 2];
  const luminance = (red + green + blue) / 3;
  const goldSignal = Math.max(0, red - blue + (green - blue) * 0.55 - 4);
  const alpha =
    Math.min(1, Math.max(0, (luminance - 10) / 38)) *
    Math.min(1, goldSignal / 24);

  const alphaByte = clampByte(alpha * 255);

  markPixels[markIndex] = red;
  markPixels[markIndex + 1] = green;
  markPixels[markIndex + 2] = blue;
  markPixels[markIndex + 3] = alphaByte;

  if (alphaByte >= ALPHA_TRIM_THRESHOLD) {
    const pixelIndex = sourceIndex / 3;
    const x = pixelIndex % source.info.width;
    const y = Math.floor(pixelIndex / source.info.width);
    markBounds.left = Math.min(markBounds.left, x);
    markBounds.top = Math.min(markBounds.top, y);
    markBounds.right = Math.max(markBounds.right, x);
    markBounds.bottom = Math.max(markBounds.bottom, y);
  }
}

if (markBounds.right < markBounds.left || markBounds.bottom < markBounds.top) {
  throw new Error("Could not find the gold mark in the source icon.");
}

const centeredMark = await sharp(markPixels, {
  raw: {
    width: source.info.width,
    height: source.info.height,
    channels: 4,
  },
})
  .extract({
    left: markBounds.left,
    top: markBounds.top,
    width: markBounds.right - markBounds.left + 1,
    height: markBounds.bottom - markBounds.top + 1,
  })
  .resize({
    width: ICON_SIZE - SAFE_PADDING * 2,
    height: ICON_SIZE - SAFE_PADDING * 2,
    fit: "inside",
  })
  .png()
  .toBuffer({ resolveWithObject: true });

const markLeft = Math.round((ICON_SIZE - centeredMark.info.width) / 2);
const markTop = Math.round((ICON_SIZE - centeredMark.info.height) / 2);

const background = Buffer.alloc(ICON_SIZE * ICON_SIZE * 4);
const maximumDistance = Math.hypot(ICON_SIZE / 2, ICON_SIZE / 2);

for (let y = 0; y < ICON_SIZE; y += 1) {
  for (let x = 0; x < ICON_SIZE; x += 1) {
    const distance = Math.hypot(x - ICON_SIZE / 2, y - ICON_SIZE / 2);
    const shade = clampByte(7 - 4 * Math.min(1, distance / maximumDistance));
    const index = (y * ICON_SIZE + x) * 4;
    background[index] = shade;
    background[index + 1] = shade;
    background[index + 2] = shade;
    background[index + 3] = 255;
  }
}

const composedIcon = await sharp(background, {
  raw: { width: ICON_SIZE, height: ICON_SIZE, channels: 4 },
})
  .composite([{ input: centeredMark.data, left: markLeft, top: markTop }])
  .png()
  .toBuffer();

await sharp(composedIcon)
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(`Generated ${outputPath}`);
