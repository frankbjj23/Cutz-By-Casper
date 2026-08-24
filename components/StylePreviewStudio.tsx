"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ACCEPTED_IMAGE_TYPES,
  beardStyleReferenceImages,
  beardStyles,
  defaultStylePreviewSelection,
  getStylePreviewOptionLabels,
  hairColorSwatches,
  hairColors,
  hairStyleReferenceImages,
  hairStyles,
  MAX_NORMALIZED_UPLOAD_BYTES,
  MAX_SOURCE_UPLOAD_BYTES,
  MIN_IMAGE_DIMENSION,
  STYLE_PREVIEW_CONSENT_VERSION,
  STYLE_PREVIEW_SESSION_KEY,
  type BeardStyleId,
  type HairColorId,
  type HairStyleId,
  type StylePreviewSelection,
} from "@/lib/style-preview";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type AccessState = "locked" | "unlocked";
type PreviewPhase = "idle" | "preparing" | "generating" | "ready" | "error";
type PreviewCategory = "hair" | "beard" | "color";

type PreparedPhoto = {
  blob: Blob;
  name: string;
  url: string;
  width: number;
  height: number;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

const categoryOptions = [
  { id: "hair", label: "Haircut", note: "Shape, blend, and finish" },
  { id: "beard", label: "Beard", note: "Length, outline, and balance" },
  { id: "color", label: "Hair color", note: "Concept color only" },
] as const;

function accessHeaders(code: string, intent?: "verify") {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${code}`,
  };
  if (intent) {
    headers["x-preview-intent"] = intent;
  }
  return headers;
}

function blobFromCanvas(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The browser could not prepare this photo."));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

async function preparePhoto(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }
  if (file.size > MAX_SOURCE_UPLOAD_BYTES) {
    throw new Error("Choose a photo smaller than 10 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo could not be opened. Try exporting it as JPEG or PNG.");
  }

  try {
    if (bitmap.width < MIN_IMAGE_DIMENSION || bitmap.height < MIN_IMAGE_DIMENSION) {
      throw new Error("Choose a photo at least 512 pixels wide and 512 pixels tall.");
    }

    const aspectRatio = bitmap.width / bitmap.height;
    if (aspectRatio < 0.5 || aspectRatio > 2) {
      throw new Error("Use a head-and-shoulders photo with less empty space around you.");
    }

    const longestSide = Math.max(bitmap.width, bitmap.height);
    const shortestSide = Math.min(bitmap.width, bitmap.height);
    const preferredScale = Math.min(1, 1600 / longestSide);
    const minimumScale = MIN_IMAGE_DIMENSION / shortestSide;
    const scale = Math.min(1, Math.max(preferredScale, minimumScale));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("This browser could not prepare the photo.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    let normalized = await blobFromCanvas(canvas, 0.88);
    if (normalized.size > MAX_NORMALIZED_UPLOAD_BYTES) {
      normalized = await blobFromCanvas(canvas, 0.76);
    }
    if (normalized.size > MAX_NORMALIZED_UPLOAD_BYTES) {
      throw new Error("The prepared photo is still too large. Try a smaller original.");
    }

    return { blob: normalized, width, height };
  } finally {
    bitmap.close();
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function RadioCard(props: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  groupName: string;
  imageSrc?: string;
  label: string;
  onChange: () => void;
  swatch?: string;
  value: string;
  visualLabel?: string;
}) {
  const hasVisual = Boolean(props.imageSrc || props.swatch);

  return (
    <label
      className={`block cursor-pointer border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-gold ${
        props.checked
          ? "border-gold bg-gold/10"
          : "border-white/15 bg-black/15 hover:border-white/35"
      } ${props.disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <input
        type="radio"
        name={props.groupName}
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
        disabled={props.disabled}
        className="sr-only"
      />
      {props.imageSrc ? (
        <span className="relative block aspect-[4/3] overflow-hidden border border-white/10 bg-black/30">
          <Image
            src={props.imageSrc}
            alt=""
            fill
            sizes="(max-width: 639px) calc(100vw - 5.5rem), 260px"
            className="object-cover"
          />
          {props.visualLabel ? (
            <span className="absolute bottom-0 left-0 bg-ink/90 px-3 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-pearl/75">
              {props.visualLabel}
            </span>
          ) : null}
        </span>
      ) : props.swatch ? (
        <span className="block border border-white/10 bg-black/30 p-2">
          <span
            aria-hidden="true"
            className="block h-16 w-full border border-white/10"
            style={{ background: props.swatch }}
          />
          {props.visualLabel ? (
            <span className="mt-2 block text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-pearl/60">
              {props.visualLabel}
            </span>
          ) : null}
        </span>
      ) : null}
      <span className={`flex items-start gap-3 ${hasVisual ? "mt-4" : ""}`}>
        <span
          aria-hidden="true"
          className={`mt-1 size-3 shrink-0 rounded-full border ${
            props.checked ? "border-gold bg-gold" : "border-pearl/45"
          }`}
        />
        <span>
          <span className="block text-sm font-semibold text-pearl">{props.label}</span>
          <span className="mt-1 block text-xs leading-5 text-pearl/60">{props.description}</span>
        </span>
      </span>
    </label>
  );
}

function getDirectionVisual(category: PreviewCategory, id: string) {
  if (category === "hair") {
    return { imageSrc: hairStyleReferenceImages[id as HairStyleId] };
  }
  if (category === "beard") {
    return { imageSrc: beardStyleReferenceImages[id as BeardStyleId] };
  }
  return { swatch: hairColorSwatches[id as HairColorId] };
}

export default function StylePreviewStudio() {
  const [accessState, setAccessState] = useState<AccessState>("locked");
  const [accessCode, setAccessCode] = useState("");
  const [accessInput, setAccessInput] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessPending, setAccessPending] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [category, setCategory] = useState<PreviewCategory>("hair");
  const [selection, setSelection] = useState<StylePreviewSelection>({
    ...defaultStylePreviewSelection,
    hairStyle: hairStyles[1].id,
  });
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [resultAccepted, setResultAccepted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<PreviewPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [formError, setFormError] = useState("");

  const photoUrlRef = useRef("");
  const resultUrlRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studioHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const accessAbortRef = useRef<AbortController | null>(null);
  const accessRequestRef = useRef(0);
  const generationAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const storedCode = sessionStorage.getItem(STYLE_PREVIEW_SESSION_KEY);
    if (!storedCode) {
      return;
    }

    const controller = new AbortController();
    const requestId = ++accessRequestRef.current;
    accessAbortRef.current = controller;

    void fetch("/api/style-preview", {
      method: "POST",
      headers: accessHeaders(storedCode, "verify"),
      cache: "no-store",
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted || requestId !== accessRequestRef.current) return;
      if (response.ok) {
        setAccessCode(storedCode);
        setProviderConfigured(response.headers.get("x-preview-provider") !== "not-configured");
        setAccessState("unlocked");
      } else {
        sessionStorage.removeItem(STYLE_PREVIEW_SESSION_KEY);
        setAccessState("locked");
      }
    }).catch(() => {
      if (!controller.signal.aborted && requestId === accessRequestRef.current) {
        setAccessState("locked");
      }
    }).finally(() => {
      if (requestId === accessRequestRef.current) {
        accessAbortRef.current = null;
        if (!controller.signal.aborted) setAccessPending(false);
      }
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      accessRequestRef.current += 1;
      accessAbortRef.current?.abort();
      generationAbortRef.current?.abort();
    };
  }, []);

  useEffect(
    () => () => {
      if (photo?.url) URL.revokeObjectURL(photo.url);
    },
    [photo?.url],
  );

  useEffect(
    () => () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    },
    [resultUrl],
  );

  useEffect(() => {
    if (phase === "error") {
      errorRef.current?.focus();
    }
    if (phase === "ready") {
      resultHeadingRef.current?.focus();
    }
  }, [phase]);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = accessInput.trim();
    if (!code) {
      setAccessError("Enter your invitation code.");
      return;
    }

    accessAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++accessRequestRef.current;
    accessAbortRef.current = controller;
    setAccessPending(true);
    setAccessError("");
    try {
      const response = await fetch("/api/style-preview", {
        method: "POST",
        headers: accessHeaders(code, "verify"),
        cache: "no-store",
        signal: controller.signal,
      });
      if (controller.signal.aborted || requestId !== accessRequestRef.current) return;
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
        setAccessError(
          response.status === 429
            ? "Too many attempts. Please wait before trying again."
            : body.error?.message ?? "That invitation code is not valid or has expired.",
        );
        return;
      }

      sessionStorage.setItem(STYLE_PREVIEW_SESSION_KEY, code);
      setAccessCode(code);
      setProviderConfigured(response.headers.get("x-preview-provider") !== "not-configured");
      setAccessInput("");
      setAccessState("unlocked");
      setTimeout(() => studioHeadingRef.current?.focus(), 0);
    } catch {
      if (controller.signal.aborted || requestId !== accessRequestRef.current) return;
      setAccessError(
        "The private preview is unavailable right now. You can still browse Casper's work or reserve on Booksy.",
      );
    } finally {
      if (requestId === accessRequestRef.current) {
        accessAbortRef.current = null;
        setAccessPending(false);
      }
    }
  }

  function revokePhotoUrl() {
    if (photoUrlRef.current) {
      URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = "";
    }
  }

  function revokeResultUrl() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
    }
  }

  function clearResult(message = "") {
    revokeResultUrl();
    setResultBlob(null);
    setResultUrl("");
    setResultAccepted(false);
    setPhase("idle");
    setStatusMessage(message);
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    revokePhotoUrl();
    setPhoto(null);
    setConsent(false);
    clearResult();
    setPhase("preparing");
    setFormError("");
    setStatusMessage("Preparing your photo in this browser.");

    try {
      const prepared = await preparePhoto(file);
      const url = URL.createObjectURL(prepared.blob);
      photoUrlRef.current = url;
      setPhoto({
        ...prepared,
        name: file.name,
        url,
      });
      setPhase("idle");
      setStatusMessage(
        `Photo prepared at ${prepared.width} by ${prepared.height} pixels. It has not been uploaded.`,
      );
    } catch (error) {
      setPhoto(null);
      setFormError(error instanceof Error ? error.message : "This photo could not be prepared.");
      setPhase("error");
      setStatusMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto() {
    revokePhotoUrl();
    clearResult();
    setPhoto(null);
    setConsent(false);
    setFormError("");
    setStatusMessage("Photo removed from this browser.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectCategory(nextCategory: PreviewCategory) {
    if (phase === "generating" || phase === "preparing") return;
    setFormError("");
    setCategory(nextCategory);
    setSelection({
      hairStyle: nextCategory === "hair" ? hairStyles[1].id : "keep-current",
      beardStyle: nextCategory === "beard" ? beardStyles[1].id : "keep-current",
      hairColor: nextCategory === "color" ? hairColors[1].id : "keep-current",
    });
    clearResult("Direction changed. Create a new preview when ready.");
  }

  function selectDirection(id: string) {
    if (phase === "generating" || phase === "preparing") return;
    setFormError("");
    setSelection((current) => ({
      ...current,
      hairStyle: category === "hair" ? (id as StylePreviewSelection["hairStyle"]) : "keep-current",
      beardStyle: category === "beard" ? (id as StylePreviewSelection["beardStyle"]) : "keep-current",
      hairColor: category === "color" ? (id as StylePreviewSelection["hairColor"]) : "keep-current",
    }));
    clearResult("Direction changed. Create a new preview when ready.");
  }

  async function createPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!photo) {
      setFormError("Choose a clear photo of yourself first.");
      setPhase("error");
      return;
    }
    if (!consent) {
      setFormError("Confirm the adult self-photo consent before creating a preview.");
      setPhase("error");
      return;
    }
    if (providerConfigured === false) {
      setFormError(
        "The image provider is not connected right now. Your photo has not been uploaded.",
      );
      setPhase("error");
      return;
    }

    setPhase("generating");
    setStatusMessage(
      "Checking your photo and creating one selected direction. This can take up to two minutes.",
    );
    revokeResultUrl();
    setResultBlob(null);
    setResultUrl("");
    setResultAccepted(false);

    const form = new FormData();
    form.set("photo", photo.blob, "casper-consultation.jpg");
    form.set("hairStyle", selection.hairStyle);
    form.set("hairColor", selection.hairColor);
    form.set("beardStyle", selection.beardStyle);
    form.set("consent", "true");
    form.set("consentVersion", STYLE_PREVIEW_CONSENT_VERSION);

    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;

    try {
      const response = await fetch("/api/style-preview", {
        method: "POST",
        headers: accessHeaders(accessCode),
        body: form,
        cache: "no-store",
        signal: controller.signal,
      });
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
        if (response.status === 401) {
          sessionStorage.removeItem(STYLE_PREVIEW_SESSION_KEY);
          setAccessState("locked");
          setAccessCode("");
        }
        throw new Error(body.error?.message ?? "The preview could not be created right now.");
      }
      if (response.headers.get("content-type")?.split(";")[0] !== "image/jpeg") {
        throw new Error("The preview service returned an unexpected result.");
      }

      const blob = await response.blob();
      if (blob.size < 10 * 1024 || blob.size > 4 * 1024 * 1024) {
        throw new Error("The preview image could not be verified.");
      }
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResultBlob(blob);
      setResultUrl(url);
      setPhase("ready");
      setStatusMessage("Your private style preview is ready.");
    } catch (error) {
      if (controller.signal.aborted) {
        if (mountedRef.current) {
          setPhase("idle");
          setStatusMessage("Generation cancelled. Your photo was not saved by this site.");
        }
        return;
      }
      setFormError(error instanceof Error ? error.message : "The preview could not be created.");
      setPhase("error");
      setStatusMessage("Your photo and result were not saved by this site.");
    } finally {
      if (generationAbortRef.current === controller) {
        generationAbortRef.current = null;
      }
    }
  }

  function cancelGeneration() {
    generationAbortRef.current?.abort();
    setPhase("idle");
    setStatusMessage("Generation cancelled. Your photo was not saved by this site.");
  }

  function deleteEverything() {
    revokePhotoUrl();
    revokeResultUrl();
    setPhoto(null);
    setResultBlob(null);
    setResultUrl("");
    setResultAccepted(false);
    setConsent(false);
    setFormError("");
    setPhase("idle");
    setStatusMessage(
      "Photo and preview removed from this browser. Provider safety logs, if created, follow the provider's retention policy.",
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function downloadLookCard() {
    if (!resultBlob) return;
    const labels = getStylePreviewOptionLabels(selection);
    const selectedLabel =
      category === "hair"
        ? labels.hairStyle
        : category === "beard"
          ? labels.beardStyle
          : labels.hairColor;

    try {
      const image = await createImageBitmap(resultBlob);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1600;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas unavailable");

        context.fillStyle = "#0A0A0B";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = "#B99A5A";
        context.lineWidth = 2;
        context.strokeRect(70, 70, 1060, 1460);

        context.fillStyle = "#B99A5A";
        context.font = "700 24px Arial, sans-serif";
        context.fillText("REDEEMED · PRECISION GROOMING", 110, 145);
        context.fillStyle = "#F4EFE6";
        context.font = "52px Georgia, serif";
        context.fillText("Private style direction", 110, 215);

        context.fillStyle = "#151516";
        context.fillRect(110, 270, 980, 980);
        drawContainedImage(context, image, 110, 270, 980, 980);

        context.fillStyle = "#B99A5A";
        context.font = "700 20px Arial, sans-serif";
        context.fillText(category.toUpperCase(), 110, 1325);
        context.fillStyle = "#F4EFE6";
        context.font = "42px Georgia, serif";
        context.fillText(selectedLabel, 110, 1380);
        context.fillStyle = "#A9A39A";
        context.font = "22px Arial, sans-serif";
        context.fillText("AI-generated concept — not a guaranteed service or result.", 110, 1445);
        context.fillText(new Date().toLocaleDateString(), 110, 1485);

        const card = await blobFromCanvas(canvas, 0.92);
        triggerDownload(card, "redeemed-precision-look-card.jpg");
      } finally {
        image.close();
      }
    } catch {
      triggerDownload(resultBlob, "redeemed-precision-style-preview.jpg");
    }
  }

  const directionOptions =
    category === "hair"
      ? hairStyles.slice(1)
      : category === "beard"
        ? beardStyles.slice(1)
        : hairColors.slice(1);
  const selectedDirection =
    category === "hair"
      ? selection.hairStyle
      : category === "beard"
        ? selection.beardStyle
        : selection.hairColor;
  const labels = getStylePreviewOptionLabels(selection);
  const selectedLabel =
    category === "hair"
      ? labels.hairStyle
      : category === "beard"
        ? labels.beardStyle
        : labels.hairColor;

  if (accessState !== "unlocked") {
    return (
      <section className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div className="space-y-6 pt-4">
          <p className="eyebrow">Private haircut &amp; beard preview</p>
          <h1 className="font-display text-5xl leading-[0.94] tracking-tight text-pearl sm:text-7xl">
            See the direction.
            <span className="block italic text-gold">Keep the decision yours.</span>
          </h1>
          <p className="max-w-xl text-base leading-8 text-pearl/65">
            Upload one clear photo and choose a fixed hair, beard, or color concept.
            You&apos;ll receive an AI-generated visual reference—not a guaranteed cut,
            color result, or available service.
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pearl/65">
            Adults 18+ · Your own photo only · No public gallery
          </p>
        </div>

        <div className="lux-card p-7 sm:p-10">
          <p className="eyebrow">Invitation only</p>
          <h2 className="mt-5 font-display text-3xl text-pearl">Enter your invitation</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-pearl/60">
            This preview is being tested with a limited group. Enter the code Casper
            shared with you. No email or account is required.
          </p>

          <form onSubmit={submitAccess} className="mt-8 space-y-5" noValidate>
            <div>
              <label
                htmlFor="preview-access-code"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-pearl"
              >
                Invitation code
              </label>
              <input
                id="preview-access-code"
                type="password"
                value={accessInput}
                onChange={(event) => setAccessInput(event.target.value)}
                disabled={accessPending}
                autoComplete="off"
                spellCheck={false}
                className="mt-3 min-h-12 w-full border border-white/20 bg-black/25 px-4 py-3 text-base text-pearl outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
                aria-describedby={accessError ? "preview-access-error" : undefined}
              />
            </div>
            {accessError ? (
              <p id="preview-access-error" role="alert" className="text-sm leading-6 text-[#f1b6ac]">
                {accessError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={accessPending}
              className="primary-button w-full disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {accessPending ? "Checking invitation…" : "Enter private preview"}
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs font-semibold uppercase tracking-[0.16em]">
            <Link href="/styles" className="text-pearl/65 transition hover:text-gold">
              Browse the portfolio
            </Link>
            <Link
              href="/book"
              className="text-pearl/65 transition hover:text-gold"
            >
              Start Booking
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="preview-studio-heading">
      <header className="max-w-3xl space-y-5">
        <p className="eyebrow">Private haircut &amp; beard preview</p>
        <h1
          id="preview-studio-heading"
          ref={studioHeadingRef}
          tabIndex={-1}
          className="font-display text-5xl leading-[0.95] text-pearl sm:text-7xl"
        >
          Choose one
          <span className="block italic text-gold">considered direction.</span>
        </h1>
        <p className="text-base leading-8 text-pearl/65">
          This beta changes one category at a time to help preserve your identity and
          keep the concept focused.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold uppercase tracking-[0.16em]">
          <Link href="/styles" className="text-pearl/65 transition hover:text-gold">
            Browse without a photo
          </Link>
          <Link
            href="/book"
            className="text-pearl/65 transition hover:text-gold"
          >
            Start Booking
          </Link>
        </div>
      </header>

      <ol className="mt-10 grid grid-cols-3 border-y border-white/10" aria-label="Preview steps">
        {[
          ["01", "Photo"],
          ["02", "Direction"],
          ["03", "Preview"],
        ].map(([number, label], index) => {
          const active =
            index === 0
              ? !photo
              : index === 1
                ? Boolean(photo) && phase !== "generating" && phase !== "ready"
                : phase === "generating" || phase === "ready";
          return (
            <li
              key={number}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 py-4 text-center sm:flex-row sm:gap-3 sm:px-5 sm:first:pl-0 ${
                active ? "text-gold" : "text-pearl/50"
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span className="text-xs font-bold tracking-[0.2em]">{number}</span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.2em]">
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {providerConfigured === false ? (
        <div
          className="mt-8 border border-[#9f7b3e] bg-[#2a2113] p-5 text-sm leading-7 text-[#f1d8aa]"
          role="status"
        >
          Your invitation is valid, but live image generation is not connected right now.
          You can still browse Casper&apos;s work or reserve on Booksy; no photo will be uploaded.
        </div>
      ) : null}

      <form onSubmit={createPreview} className="mt-10 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]" noValidate>
        <div className="space-y-8">
          <section className="lux-card p-6 sm:p-8" aria-labelledby="photo-heading">
            <p className="eyebrow">01 · Photo</p>
            <h2 id="photo-heading" className="mt-4 font-display text-3xl text-pearl">
              Choose your photo
            </h2>
            <p className="mt-4 text-sm leading-7 text-pearl/60">
              Use one recent head-and-shoulders photo of yourself. Face the camera in
              even light. Keep your hairline, ears, cheeks, and jaw visible. No hats,
              heavy filters, or group photos.
            </p>

            <label className="secondary-button mt-6 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-gold">
              {phase === "preparing"
                ? "Preparing photo…"
                : photo
                  ? "Replace photo"
                  : "Choose a photo"}
              <input
                ref={fileInputRef}
                id="style-preview-photo"
                name="photo-source"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectPhoto}
                disabled={phase === "generating" || phase === "preparing"}
                aria-describedby="style-preview-photo-requirements"
                className="sr-only"
              />
            </label>
            <p id="style-preview-photo-requirements" className="mt-3 text-xs leading-5 text-pearl/55">
              JPEG, PNG, or WebP · 10 MB source maximum · Selecting stays on your device
              until you consent and create
            </p>

            {photo ? (
              <div className="mt-6 border-t border-white/10 pt-6">
                {/* A prepared browser object URL never becomes a public asset. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Prepared portrait selected for the private style preview"
                  className="max-h-80 w-full bg-black/30 object-contain"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-[70%] truncate text-xs text-pearl/60" title={photo.name}>
                    {photo.name}
                  </p>
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={phase === "generating"}
                    className="min-h-11 text-xs font-semibold uppercase tracking-[0.16em] text-pearl/65 underline decoration-gold underline-offset-8 hover:text-pearl"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="lux-card p-6 sm:p-8" aria-labelledby="direction-heading">
            <p className="eyebrow">02 · Direction</p>
            <h2 id="direction-heading" className="mt-4 font-display text-3xl text-pearl">
              What would you like to preview?
            </h2>
            <fieldset className="mt-6">
              <legend className="sr-only">Preview category</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {categoryOptions.map((option) => (
                  <RadioCard
                    key={option.id}
                    groupName="preview-category"
                    value={option.id}
                    checked={category === option.id}
                    onChange={() => selectCategory(option.id)}
                    disabled={phase === "generating" || phase === "preparing"}
                    label={option.label}
                    description={option.note}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-8">
              <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-pearl">
                Select one {category === "color" ? "color" : "style"}
              </legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {directionOptions.map((option) => {
                  const visual = getDirectionVisual(category, option.id);
                  return (
                    <RadioCard
                      key={option.id}
                      groupName="preview-direction"
                      value={option.id}
                      checked={selectedDirection === option.id}
                      onChange={() => selectDirection(option.id)}
                      disabled={phase === "generating" || phase === "preparing"}
                      label={option.name}
                      description={option.note}
                      imageSrc={visual.imageSrc}
                      swatch={visual.swatch}
                      visualLabel={
                        category === "color"
                          ? "Color direction"
                          : "Reference from Casper's portfolio"
                      }
                    />
                  );
                })}
              </div>
            </fieldset>

            {category === "color" ? (
              <p className="mt-6 border-l-2 border-gold pl-4 text-xs leading-6 text-pearl/65">
                Color preview only. Lighting, current color, hair condition, and the real
                process can change the result. Hair coloring is not currently listed in
                Casper&apos;s Booksy service menu.
              </p>
            ) : null}
          </section>

          <section className="light-panel p-6 sm:p-8" aria-labelledby="consent-heading">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-ink/65">
              Before transmission
            </p>
            <h2 id="consent-heading" className="mt-4 font-display text-3xl text-ink">
              Your consent
            </h2>
            <label className="mt-6 flex cursor-pointer items-start gap-4 text-sm leading-7 text-ink/80">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                disabled={!photo || phase === "generating"}
                className="mt-1 size-5 shrink-0 accent-[#8f713b]"
              />
              <span>
                I am 18 or older, this photo is of me, and I consent to temporary
                processing by Redeemed Precision Grooming and OpenAI solely to create
                this preview.
              </span>
            </label>
            <p className="mt-4 text-xs leading-6 text-ink/65">
              This site does not save the photo or result. OpenAI&apos;s default API safety
              logs may retain submitted content for up to 30 days. Read the{" "}
              <Link href="/privacy#style-preview" className="font-semibold underline decoration-gold underline-offset-4">
                preview privacy details
              </Link>
              .
            </p>
          </section>

          {formError ? (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="border border-[#9f5649] bg-[#2b1715] p-5 text-sm leading-6 text-[#f1c6be]"
            >
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              phase === "generating" ||
              phase === "preparing" ||
              providerConfigured === false
            }
            className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "generating" ? "Creating preview…" : `Preview ${selectedLabel}`}
          </button>
          <p className="text-xs leading-6 text-pearl/55">
            Creates one visual concept. Keep this page open while it is prepared.
          </p>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start" aria-busy={phase === "generating"}>
          <div className="lux-card min-h-[32rem] p-6 sm:p-8">
            <p className="eyebrow">03 · Preview</p>
            <h2
              ref={resultHeadingRef}
              tabIndex={-1}
              className="mt-4 font-display text-3xl text-pearl"
            >
              {phase === "ready" ? "Your selected direction" : "Your private canvas"}
            </h2>

            {phase === "generating" ? (
              <div className="grid min-h-[24rem] place-items-center text-center">
                <div className="max-w-sm space-y-5">
                  <span
                    aria-hidden="true"
                    className="mx-auto block size-12 animate-spin rounded-full border-2 border-white/15 border-t-gold motion-reduce:animate-none"
                  />
                  <p className="font-display text-2xl text-pearl">Creating the direction</p>
                  <p className="text-sm leading-7 text-pearl/60">
                    The photo is being checked, edited, and reviewed. No percentage is
                    shown because generation time varies.
                  </p>
                  <button
                    type="button"
                    onClick={cancelGeneration}
                    className="min-h-11 border border-white/20 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-pearl/70 hover:border-gold hover:text-gold"
                  >
                    Cancel generation
                  </button>
                </div>
              </div>
            ) : resultUrl && photo ? (
              <div className="mt-7 space-y-7">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt="Original prepared portrait"
                      className="aspect-[4/5] w-full bg-black/30 object-contain"
                    />
                    <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-pearl/55">
                      Original
                    </figcaption>
                  </figure>
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resultUrl}
                      alt={`AI preview showing ${selectedLabel}`}
                      className="aspect-[4/5] w-full bg-black/30 object-contain"
                    />
                    <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                      AI preview
                    </figcaption>
                  </figure>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <p className="text-sm leading-7 text-pearl/65">
                    AI-generated concept. Hair density, texture, growth pattern, existing
                    color, lighting, and Casper&apos;s in-person assessment can affect the
                    real result. This is not a service or outcome guarantee.
                  </p>
                  <p className="mt-5 font-display text-xl text-pearl">Does this still look like you?</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      aria-pressed={resultAccepted}
                      onClick={() => setResultAccepted(true)}
                      className={`min-h-11 border px-4 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                        resultAccepted
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-white/20 text-pearl/70 hover:border-gold hover:text-gold"
                      }`}
                    >
                      Yes — keep it
                    </button>
                    <button
                      type="button"
                      onClick={() => clearResult("Preview deleted. Try another direction or photo.")}
                      className="min-h-11 border border-white/20 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-pearl/70 hover:border-gold hover:text-gold"
                    >
                      No — delete result
                    </button>
                  </div>
                </div>

                {resultAccepted ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <Link
                      href="/book"
                      className="primary-button"
                    >
                      Start Booking
                    </Link>
                    <button type="button" onClick={downloadLookCard} className="secondary-button">
                      Download look card
                    </button>
                    <button
                      type="button"
                      onClick={deleteEverything}
                      className="min-h-11 text-xs font-semibold uppercase tracking-[0.16em] text-pearl/60 underline decoration-gold underline-offset-8 hover:text-pearl sm:col-span-2 lg:col-span-1 xl:col-span-2"
                    >
                      Delete photo and preview
                    </button>
                  </div>
                ) : (
                  <p className="border-l-2 border-gold pl-4 text-xs leading-6 text-pearl/60">
                    Confirm the likeness above before downloading this concept or using it
                    as your consultation reference.
                  </p>
                )}
                <p className="text-xs leading-6 text-pearl/55">
                  Booksy opens separately. Your photo is not sent to Booksy. Check its
                  live menu, pricing, availability, and terms before confirming.
                </p>
              </div>
            ) : (
              <div className="mt-7 grid min-h-[24rem] place-items-center border border-dashed border-white/15 bg-black/15 p-8 text-center">
                <div className="max-w-sm space-y-4">
                  <div className="editorial-rule mx-auto" />
                  <p className="font-display text-2xl text-pearl">One concept at a time</p>
                  <p className="text-sm leading-7 text-pearl/55">
                    Your original and generated direction will appear here only after you
                    choose a photo, give consent, and create the preview.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </form>

      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </section>
  );
}
