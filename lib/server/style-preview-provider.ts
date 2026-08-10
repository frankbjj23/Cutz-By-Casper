import type { StylePreviewSelection } from "@/lib/style-preview";
import { getStylePreviewPromptParts } from "@/lib/server/style-preview-prompts";
import sharp from "sharp";

const OPENAI_API_URL = "https://api.openai.com/v1";
const DEFAULT_IMAGE_MODEL = "gpt-image-2-2026-04-21";

type OpenAIErrorBody = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
};

type OpenAIModerationResponse = {
  results?: Array<{
    flagged?: boolean;
  }>;
};

export type StylePreviewProviderErrorCode =
  | "configuration"
  | "moderation"
  | "photo"
  | "capacity"
  | "timeout"
  | "upstream";

export class StylePreviewProviderError extends Error {
  constructor(
    readonly code: StylePreviewProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StylePreviewProviderError";
  }
}

function buildPrompt(selection: StylePreviewSelection) {
  const parts = getStylePreviewPromptParts(selection);

  return `
Create one photorealistic barber-consultation preview by editing the supplied portrait.

EDIT SCOPE
- Scalp hair: ${parts.hairStyle}
- Scalp hair color: ${parts.hairColor}
- Facial hair: ${parts.beardStyle}

IDENTITY LOCK
- Preserve this person's recognizable identity exactly: facial geometry, eyes, eyebrows, nose, lips, jaw, ears, skin tone, natural skin texture, age, expression, and gaze.
- Preserve the original body, clothing, jewelry, background, lighting direction, camera angle, framing, and lens perspective.
- Modify only scalp hair and facial hair as directed above. Do not beautify, smooth skin, reshape the face or body, change eye color, add makeup, or alter the eyebrows.

QUALITY
- Make the haircut, hairline, fade transitions, strand direction, density, beard growth, and edges anatomically plausible and professionally groomed.
- Match the existing light, shadows, depth of field, and image grain so the result reads as the same photograph.
- Do not add words, logos, watermarks, tools, extra people, extra facial features, or accessories.
- Return a single finished portrait, not a collage, diagram, before-and-after, or style sheet.
`.trim();
}

function safeErrorMetadata(body: OpenAIErrorBody) {
  return {
    code: body.error?.code ?? "unknown",
    type: body.error?.type ?? "unknown",
  };
}

async function moderateImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  signal: AbortSignal,
) {
  const response = await fetch(`${OPENAI_API_URL}/moderations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
          },
        },
      ],
    }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as OpenAIErrorBody;
    console.warn("style_preview.moderation_failed", {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      ...safeErrorMetadata(body),
    });
    throw new StylePreviewProviderError(
      "upstream",
      "The preview safety check is temporarily unavailable.",
    );
  }

  const body = (await response.json()) as OpenAIModerationResponse;
  return body.results?.some((result) => result.flagged === true) ?? true;
}

function mapImageApiError(status: number, body: OpenAIErrorBody) {
  const providerMessage = body.error?.message?.toLowerCase() ?? "";
  const providerCode = body.error?.code?.toLowerCase() ?? "";

  if (status === 401 || status === 403) {
    return new StylePreviewProviderError(
      "configuration",
      "The preview service is not configured for image generation.",
    );
  }

  if (status === 429) {
    return new StylePreviewProviderError(
      "capacity",
      "The preview studio is busy. Please try again shortly.",
    );
  }

  if (
    providerCode === "moderation_blocked" ||
    providerCode.includes("safety") ||
    providerMessage.includes("safety") ||
    providerMessage.includes("policy")
  ) {
    return new StylePreviewProviderError(
      "moderation",
      "This photo could not be used for a style preview.",
    );
  }

  if (status === 400 || status === 422) {
    return new StylePreviewProviderError(
      "photo",
      "The image provider could not process this photo. Try a clear, front-facing portrait.",
    );
  }

  return new StylePreviewProviderError(
    "upstream",
    "The preview could not be created right now.",
  );
}

export async function createStylePreview(input: {
  imageBytes: Uint8Array;
  mimeType: string;
  selection: StylePreviewSelection;
  signal: AbortSignal;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new StylePreviewProviderError(
      "configuration",
      "The preview service has not been connected yet.",
    );
  }

  const sourceBase64 = Buffer.from(input.imageBytes).toString("base64");
  if (await moderateImage(apiKey, sourceBase64, input.mimeType, input.signal)) {
    throw new StylePreviewProviderError(
      "moderation",
      "This photo is not eligible for the private style preview.",
    );
  }

  const form = new FormData();
  const uploadBuffer = new ArrayBuffer(input.imageBytes.byteLength);
  new Uint8Array(uploadBuffer).set(input.imageBytes);
  form.append("model", process.env.STYLE_PREVIEW_MODEL ?? DEFAULT_IMAGE_MODEL);
  form.append("image[]", new Blob([uploadBuffer], { type: input.mimeType }), "portrait.jpg");
  form.append("prompt", buildPrompt(input.selection));
  form.append("size", "1024x1536");
  form.append("quality", "medium");
  form.append("output_format", "jpeg");
  form.append("output_compression", "78");
  form.append("moderation", "auto");
  form.append("n", "1");

  const startedAt = Date.now();
  const response = await fetch(`${OPENAI_API_URL}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
    cache: "no-store",
    signal: input.signal,
  });
  const requestId = response.headers.get("x-request-id");

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as OpenAIErrorBody;
    console.warn("style_preview.generation_failed", {
      status: response.status,
      requestId,
      durationMs: Date.now() - startedAt,
      ...safeErrorMetadata(body),
    });
    throw mapImageApiError(response.status, body);
  }

  const body = (await response.json()) as OpenAIImageResponse;
  const resultBase64 = body.data?.[0]?.b64_json;
  if (!resultBase64) {
    console.warn("style_preview.generation_empty", {
      requestId,
      durationMs: Date.now() - startedAt,
    });
    throw new StylePreviewProviderError(
      "upstream",
      "The preview service returned no image.",
    );
  }

  if (await moderateImage(apiKey, resultBase64, "image/jpeg", input.signal)) {
    throw new StylePreviewProviderError(
      "moderation",
      "The generated preview could not be displayed safely.",
    );
  }

  let resultBytes: Uint8Array;
  try {
    const decoded = await sharp(Buffer.from(resultBase64, "base64"), {
      failOn: "error",
      limitInputPixels: 20_000_000,
    })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({
        width: 1024,
        height: 1536,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    resultBytes = new Uint8Array(decoded);
  } catch {
    resultBytes = new Uint8Array();
  }

  if (resultBytes.length < 10 * 1024 || resultBytes.length > 4 * 1024 * 1024) {
    console.warn("style_preview.output_invalid", {
      requestId,
      durationMs: Date.now() - startedAt,
      size: resultBytes.length,
    });
    throw new StylePreviewProviderError(
      "upstream",
      "The preview service returned an invalid image.",
    );
  }

  console.info("style_preview.completed", {
    requestId,
    durationMs: Date.now() - startedAt,
  });

  return {
    imageBytes: resultBytes,
    mimeType: "image/jpeg" as const,
  };
}
