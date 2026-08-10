import { NextResponse } from "next/server";
import sharp from "sharp";
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

function jsonError(status: number, code: string, message: string, retryAfter?: number) {
  const headers: Record<string, string> = { ...RESPONSE_HEADERS };
  if (retryAfter) {
    headers["Retry-After"] = String(retryAfter);
  }
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

const SHARP_FORMAT_BY_MIME = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

async function sanitizeSourceImage(bytes: Uint8Array, declaredType: string) {
  try {
    const image = sharp(Buffer.from(bytes), {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION,
    });
    const metadata = await image.metadata();
    const expectedFormat =
      SHARP_FORMAT_BY_MIME[declaredType as keyof typeof SHARP_FORMAT_BY_MIME];
    if (
      !expectedFormat ||
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages && metadata.pages !== 1)
    ) {
      return null;
    }

    if (
      metadata.width < MIN_IMAGE_DIMENSION ||
      metadata.height < MIN_IMAGE_DIMENSION ||
      metadata.width > MAX_IMAGE_DIMENSION ||
      metadata.height > MAX_IMAGE_DIMENSION
    ) {
      return { dimensionsInvalid: true } as const;
    }

    const { data, info } = await image
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    if (
      info.width < MIN_IMAGE_DIMENSION ||
      info.height < MIN_IMAGE_DIMENSION ||
      data.length < 10 * 1024 ||
      data.length > MAX_NORMALIZED_UPLOAD_BYTES
    ) {
      return null;
    }

    return {
      dimensionsInvalid: false,
      imageBytes: new Uint8Array(data),
      mimeType: "image/jpeg" as const,
    };
  } catch {
    return null;
  }
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
    return jsonError(
      403,
      "ORIGIN_DENIED",
      "This request must come from the Redeemed Precision Grooming site.",
    );
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

  const processingLimit = consumeStylePreviewRateLimit(request, "processing");
  if (!processingLimit.allowed) {
    return jsonError(
      429,
      "PROCESSING_LIMIT",
      "This network has sent too many preview requests. Please try again later.",
      retryAfterSeconds(processingLimit.resetAt),
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
  const sanitizedImage = await sanitizeSourceImage(imageBytes, photo.type);
  if (!sanitizedImage) {
    return jsonError(415, "PHOTO_INVALID", "The photo format could not be verified.");
  }
  if (sanitizedImage.dimensionsInvalid) {
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
      imageBytes: sanitizedImage.imageBytes,
      mimeType: sanitizedImage.mimeType,
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
        "Content-Disposition": 'inline; filename="redeemed-precision-style-preview.jpg"',
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
