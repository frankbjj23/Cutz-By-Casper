import { NextResponse } from "next/server";
import {
  ACCEPTED_IMAGE_TYPES,
  hasRequestedChange,
  MAX_IMAGE_DIMENSION,
  MAX_NORMALIZED_UPLOAD_BYTES,
  MIN_IMAGE_DIMENSION,
  parseStylePreviewSelection,
  requestedChangeCount,
  STYLE_PREVIEW_CONSENT_VERSION,
} from "@/lib/style-preview";
import {
  consumeStylePreviewRateLimit,
  hasValidStylePreviewAccess,
  pruneStylePreviewRateLimits,
} from "@/lib/server/style-preview-access";
import {
  createStylePreview,
  StylePreviewProviderError,
} from "@/lib/server/style-preview-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_REQUEST_BYTES = MAX_NORMALIZED_UPLOAD_BYTES + 256 * 1024;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

type ImageMetadata = {
  mimeType: (typeof ACCEPTED_IMAGE_TYPES)[number];
  width: number;
  height: number;
};

function jsonError(status: number, code: string, message: string, retryAfter?: number) {
  const headers: Record<string, string> = { ...RESPONSE_HEADERS };
  if (retryAfter) {
    headers["Retry-After"] = String(retryAfter);
  }
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

function readJpegDimensions(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }
    if (offset + 2 > bytes.length) {
      break;
    }

    const length = (bytes[offset] << 8) | bytes[offset + 1];
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame && offset + 7 < bytes.length) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    if (length < 2) {
      break;
    }
    offset += length;
  }
  return null;
}

function readImageMetadata(bytes: Uint8Array, declaredType: string): ImageMetadata | null {
  const isJpeg =
    bytes.length > 10 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9;
  if (isJpeg && declaredType === "image/jpeg") {
    const dimensions = readJpegDimensions(bytes);
    return dimensions ? { mimeType: "image/jpeg", ...dimensions } : null;
  }

  const isPng =
    bytes.length > 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (isPng && declaredType === "image/png") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const hasIhdr =
      view.getUint32(8, false) === 13 &&
      String.fromCharCode(...bytes.slice(12, 16)) === "IHDR";
    const hasIend =
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(bytes.length - 8, bytes.length - 4)) === "IEND";
    if (!hasIhdr || !hasIend) return null;
    return {
      mimeType: "image/png",
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
    };
  }

  const isWebp =
    bytes.length > 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (isWebp && declaredType === "image/webp") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(4, true) + 8 !== bytes.length) return null;
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    const chunkLength = view.getUint32(16, true);
    if (chunk === "VP8X" && chunkLength === 10) {
      const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      return { mimeType: "image/webp", width, height };
    }
    if (
      chunk === "VP8 " &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
      const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
      return { mimeType: "image/webp", width, height };
    }
    if (chunk === "VP8L" && chunkLength >= 5 && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >>> 14) & 0x3fff) + 1;
      return { mimeType: "image/webp", width, height };
    }
  }

  return null;
}

function retryAfterSeconds(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

export async function POST(request: Request) {
  pruneStylePreviewRateLimits();
  const intent = request.headers.get("x-preview-intent") === "verify" ? "verify" : "generate";
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.STYLE_PREVIEW_ALLOWED_ORIGIN ?? new URL(request.url).origin;
  if (origin !== allowedOrigin) {
    return jsonError(403, "ORIGIN_DENIED", "This request must come from the Cutz By Casper site.");
  }

  const authorization = request.headers.get("authorization");
  const accessCode = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (intent === "verify") {
    const accessLimit = consumeStylePreviewRateLimit(request, "access");
    if (!accessLimit.allowed) {
      return jsonError(
        429,
        "ACCESS_LIMIT",
        "Too many access attempts. Please wait before trying again.",
        retryAfterSeconds(accessLimit.resetAt),
      );
    }
  }

  if (!hasValidStylePreviewAccess(accessCode)) {
    if (intent !== "verify") {
      const accessLimit = consumeStylePreviewRateLimit(request, "access");
      if (!accessLimit.allowed) {
        return jsonError(
          429,
          "ACCESS_LIMIT",
          "Too many access attempts. Please wait before trying again.",
          retryAfterSeconds(accessLimit.resetAt),
        );
      }
    }
    return jsonError(401, "ACCESS_DENIED", "That invitation code is not valid.");
  }

  if (intent === "verify") {
    return new Response(null, {
      status: 204,
      headers: {
        ...RESPONSE_HEADERS,
        "X-Preview-Provider": process.env.OPENAI_API_KEY ? "configured" : "not-configured",
      },
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return jsonError(415, "CONTENT_TYPE", "The preview request must include one photo.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonError(
      413,
      "PHOTO_TOO_LARGE",
      "The prepared photo is too large. Choose a smaller image and try again.",
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "INVALID_REQUEST", "The preview request could not be read.");
  }

  if (
    form.get("consent") !== "true" ||
    form.get("consentVersion") !== STYLE_PREVIEW_CONSENT_VERSION
  ) {
    return jsonError(
      400,
      "CONSENT_REQUIRED",
      "Adult self-photo consent is required for this preview.",
    );
  }

  const selection = parseStylePreviewSelection({
    hairStyle: String(form.get("hairStyle") ?? ""),
    hairColor: String(form.get("hairColor") ?? ""),
    beardStyle: String(form.get("beardStyle") ?? ""),
  });
  if (!selection) {
    return jsonError(400, "INVALID_SELECTION", "Choose an available hair and beard option.");
  }
  if (!hasRequestedChange(selection)) {
    return jsonError(400, "NO_CHANGE", "Choose at least one change to preview.");
  }
  if (requestedChangeCount(selection) !== 1) {
    return jsonError(
      400,
      "ONE_CHANGE_ONLY",
      "Choose one hair, beard, or color direction per preview.",
    );
  }

  const photos = form.getAll("photo");
  const photo = photos[0];
  if (photos.length !== 1 || !(photo instanceof File)) {
    return jsonError(400, "PHOTO_REQUIRED", "Choose a portrait photo to continue.");
  }
  if (photo.size < 10 * 1024 || photo.size > MAX_NORMALIZED_UPLOAD_BYTES) {
    return jsonError(
      photo.size > MAX_NORMALIZED_UPLOAD_BYTES ? 413 : 400,
      photo.size > MAX_NORMALIZED_UPLOAD_BYTES ? "PHOTO_TOO_LARGE" : "PHOTO_INVALID",
      photo.size > MAX_NORMALIZED_UPLOAD_BYTES
        ? "The prepared photo is too large. Choose a smaller image and try again."
        : "The photo file is too small or incomplete.",
    );
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(photo.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return jsonError(415, "PHOTO_TYPE", "Use a JPEG, PNG, or WebP photo.");
  }

  const imageBytes = new Uint8Array(await photo.arrayBuffer());
  const metadata = readImageMetadata(imageBytes, photo.type);
  if (!metadata) {
    return jsonError(415, "PHOTO_INVALID", "The photo format could not be verified.");
  }
  if (
    metadata.width < MIN_IMAGE_DIMENSION ||
    metadata.height < MIN_IMAGE_DIMENSION ||
    metadata.width > MAX_IMAGE_DIMENSION ||
    metadata.height > MAX_IMAGE_DIMENSION
  ) {
    return jsonError(
      400,
      "PHOTO_DIMENSIONS",
      `Use a photo between ${MIN_IMAGE_DIMENSION} and ${MAX_IMAGE_DIMENSION} pixels on each side.`,
    );
  }

  const generationLimit = consumeStylePreviewRateLimit(request, "generation");
  if (!generationLimit.allowed) {
    return jsonError(
      429,
      "PREVIEW_LIMIT",
      "This network has reached its preview limit for now. Please try again later.",
      retryAfterSeconds(generationLimit.resetAt),
    );
  }

  const controller = new AbortController();
  const abortForDisconnect = () => controller.abort(request.signal.reason);
  if (request.signal.aborted) {
    abortForDisconnect();
  } else {
    request.signal.addEventListener("abort", abortForDisconnect, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), 270_000);
  try {
    const result = await createStylePreview({
      imageBytes,
      mimeType: metadata.mimeType,
      selection,
      signal: controller.signal,
    });
    const responseBuffer = new ArrayBuffer(result.imageBytes.byteLength);
    new Uint8Array(responseBuffer).set(result.imageBytes);
    return new Response(responseBuffer, {
      status: 200,
      headers: {
        ...RESPONSE_HEADERS,
        "Content-Type": result.mimeType,
        "Content-Disposition": 'inline; filename="casper-style-preview.jpg"',
      },
    });
  } catch (error) {
    if (controller.signal.aborted) {
      if (request.signal.aborted) {
        return jsonError(
          499,
          "CLIENT_CLOSED",
          "The preview request was cancelled. Your photo was not saved.",
        );
      }
      return jsonError(
        504,
        "PREVIEW_TIMEOUT",
        "The preview took too long. Your photo was not saved; please try again.",
      );
    }

    if (error instanceof StylePreviewProviderError) {
      const status =
        error.code === "moderation" || error.code === "photo"
          ? 422
          : error.code === "timeout"
            ? 504
            : 503;
      return jsonError(status, `PROVIDER_${error.code.toUpperCase()}`, error.message);
    }

    console.error("style_preview.unexpected_failure", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return jsonError(
      500,
      "PREVIEW_FAILED",
      "The preview could not be created. Your photo was not saved.",
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortForDisconnect);
  }
}
