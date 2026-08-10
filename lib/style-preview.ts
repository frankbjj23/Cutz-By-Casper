export const STYLE_PREVIEW_CONSENT_VERSION = "2026-08-10-v2";
export const STYLE_PREVIEW_SESSION_KEY = "redeemed-style-preview-access";

export const MAX_SOURCE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_NORMALIZED_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MIN_IMAGE_DIMENSION = 512;
export const MAX_IMAGE_DIMENSION = 4096;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type PreviewOption = {
  id: string;
  name: string;
  note: string;
};

export const hairStyles = [
  {
    id: "keep-current",
    name: "Keep current hair",
    note: "Preserve the haircut in your photo.",
  },
  {
    id: "low-taper-curls",
    name: "Low taper + natural curls",
    note: "Soft tapering with natural texture left on top.",
  },
  {
    id: "low-fade-crop",
    name: "Low fade + textured crop",
    note: "Clean lower blend with controlled movement above.",
  },
  {
    id: "classic-side-part",
    name: "Classic side part + taper",
    note: "A polished, executive finish with subtle structure.",
  },
  {
    id: "buzz-lineup",
    name: "Buzz cut + line-up",
    note: "Close, even length with a sharp perimeter.",
  },
  {
    id: "mid-fade-texture",
    name: "Mid fade + textured top",
    note: "A stronger blend with shaped texture and balance.",
  },
  {
    id: "high-fade-crop",
    name: "High fade + short crop",
    note: "High contrast, tailored close to the head.",
  },
  {
    id: "curly-burst-fade",
    name: "Curly burst fade",
    note: "Rounded texture framed by a sculpted ear-level fade.",
  },
] as const satisfies readonly PreviewOption[];

export const hairColors = [
  {
    id: "keep-current",
    name: "Keep current color",
    note: "Preserve your visible hair color.",
  },
  {
    id: "natural-black",
    name: "Natural black",
    note: "Deep neutral black with natural dimension.",
  },
  {
    id: "espresso-brown",
    name: "Espresso brown",
    note: "A dark, cool brown with understated richness.",
  },
  {
    id: "warm-brown",
    name: "Warm medium brown",
    note: "Soft warmth that remains natural in varied light.",
  },
  {
    id: "silver",
    name: "Silver / gray",
    note: "A dimensional salt-and-pepper silver finish.",
  },
  {
    id: "platinum",
    name: "Platinum",
    note: "A cool, high-impact concept color.",
  },
  {
    id: "copper",
    name: "Copper",
    note: "A rich copper concept with natural tonal variation.",
  },
  {
    id: "burgundy",
    name: "Burgundy",
    note: "A deep wine-toned creative concept.",
  },
] as const satisfies readonly PreviewOption[];

export const beardStyles = [
  {
    id: "keep-current",
    name: "Keep current facial hair",
    note: "Preserve the beard or clean-shaven look in your photo.",
  },
  {
    id: "clean-shaven",
    name: "Clean shaven",
    note: "Remove visible facial hair while preserving natural skin texture.",
  },
  {
    id: "designer-stubble",
    name: "Designer stubble",
    note: "Short, even shadow with intentional clean edges.",
  },
  {
    id: "short-boxed",
    name: "Short boxed beard",
    note: "Compact fullness with tailored cheek and neck lines.",
  },
  {
    id: "sculpted-full",
    name: "Sculpted full beard",
    note: "Fuller length shaped to complement the face.",
  },
  {
    id: "goatee",
    name: "Goatee",
    note: "Focused shape around the mouth and chin.",
  },
  {
    id: "mustache",
    name: "Statement mustache",
    note: "A neatly groomed mustache with clean-shaven cheeks and chin.",
  },
] as const satisfies readonly PreviewOption[];

export type HairStyleId = (typeof hairStyles)[number]["id"];
export type HairColorId = (typeof hairColors)[number]["id"];
export type BeardStyleId = (typeof beardStyles)[number]["id"];

export type StylePreviewSelection = {
  hairStyle: HairStyleId;
  hairColor: HairColorId;
  beardStyle: BeardStyleId;
};

export const defaultStylePreviewSelection: StylePreviewSelection = {
  hairStyle: "keep-current",
  hairColor: "keep-current",
  beardStyle: "keep-current",
};

function optionById<T extends readonly PreviewOption[]>(options: T, id: string) {
  return options.find((option) => option.id === id);
}

export function parseStylePreviewSelection(input: {
  hairStyle: string;
  hairColor: string;
  beardStyle: string;
}): StylePreviewSelection | null {
  if (
    !optionById(hairStyles, input.hairStyle) ||
    !optionById(hairColors, input.hairColor) ||
    !optionById(beardStyles, input.beardStyle)
  ) {
    return null;
  }

  return input as StylePreviewSelection;
}

export function hasRequestedChange(selection: StylePreviewSelection) {
  return requestedChangeCount(selection) > 0;
}

export function requestedChangeCount(selection: StylePreviewSelection) {
  return [selection.hairStyle, selection.hairColor, selection.beardStyle].filter(
    (value) => value !== "keep-current",
  ).length;
}

export function getStylePreviewOptionLabels(selection: StylePreviewSelection) {
  return {
    hairStyle: optionById(hairStyles, selection.hairStyle)?.name ?? "Unknown",
    hairColor: optionById(hairColors, selection.hairColor)?.name ?? "Unknown",
    beardStyle: optionById(beardStyles, selection.beardStyle)?.name ?? "Unknown",
  };
}
