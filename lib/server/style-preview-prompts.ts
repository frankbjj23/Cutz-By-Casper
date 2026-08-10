import type { StylePreviewSelection } from "@/lib/style-preview";

const hairStylePrompts: Record<StylePreviewSelection["hairStyle"], string> = {
  "keep-current":
    "Keep the existing scalp hair style, length, texture, density, and hairline unchanged.",
  "low-taper-curls":
    "Create a precise low taper at the temples and neckline while keeping a natural, defined curly texture on top.",
  "low-fade-crop":
    "Create a clean low fade with a smooth transition into a short, refined textured crop on top and a crisp natural hairline.",
  "classic-side-part":
    "Create a polished classic side part with controlled volume, a subtle taper at the sides and neckline, and a precise natural edge.",
  "buzz-lineup":
    "Create an even close buzz cut with realistic scalp coverage, a sharp but natural line-up, and softly tapered sideburns and neckline.",
  "mid-fade-texture":
    "Create a balanced mid fade with a seamless blend and a neatly shaped, medium-short textured top.",
  "high-fade-crop":
    "Create a high skin fade with a seamless transition into a short tailored crop, keeping the proportions realistic for this head shape.",
  "curly-burst-fade":
    "Create a refined curly burst fade that arcs naturally around the ears, with controlled curls and a clean, realistic neckline.",
};

const hairColorPrompts: Record<StylePreviewSelection["hairColor"], string> = {
  "keep-current": "Keep the existing scalp hair color unchanged.",
  "natural-black":
    "Color the scalp hair a dimensional natural black without changing the skin or eyebrows.",
  "espresso-brown":
    "Color the scalp hair a rich dark espresso brown with realistic tonal variation.",
  "warm-brown":
    "Color the scalp hair a warm medium brown with believable highlights and root depth.",
  silver:
    "Color the scalp hair a refined dimensional silver-gray with realistic darker roots and natural strand variation.",
  platinum:
    "Color the scalp hair a cool platinum tone with realistic root depth and strand texture, without altering the eyebrows or skin tone.",
  copper: "Color the scalp hair a rich natural copper with believable lowlights and highlights.",
  burgundy:
    "Color the scalp hair a deep, refined burgundy with subtle dimensional variation and realistic roots.",
};

const beardStylePrompts: Record<StylePreviewSelection["beardStyle"], string> = {
  "keep-current": "Keep the existing facial hair style, density, color, and edges unchanged.",
  "clean-shaven":
    "Create a clean-shaven face, removing beard and mustache hair while preserving natural pores, skin texture, facial structure, and skin tone.",
  "designer-stubble":
    "Create even designer stubble at a realistic short length with a clean cheek line and a natural neckline.",
  "short-boxed":
    "Create a short boxed beard with realistic density, a tailored cheek line, connected mustache, and a clean natural neckline.",
  "sculpted-full":
    "Create a groomed full beard with realistic strand density, balanced length, a sculpted cheek line, and a precise natural neckline.",
};

export function getStylePreviewPromptParts(selection: StylePreviewSelection) {
  return {
    hairStyle: hairStylePrompts[selection.hairStyle],
    hairColor: hairColorPrompts[selection.hairColor],
    beardStyle: beardStylePrompts[selection.beardStyle],
  };
}
