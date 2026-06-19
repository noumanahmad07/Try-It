import type { BodyAnalysis } from "../types";

function normalizeFileName(name: string | null | undefined) {
  return (name || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .trim();
}

function garmentDescriptorFromFileName(fileName: string | null | undefined) {
  const name = normalizeFileName(fileName);

  if (!name) return "shirt";

  if (name.includes("navy")) return "navy blue button-down shirt";
  if (name.includes("denim") || name.includes("chambray"))
    return "light blue denim button-down shirt";
  if (name.includes("check") || name.includes("plaid"))
    return "blue checkered button-down shirt";
  if (name.includes("stripe") || name.includes("striped"))
    return "striped button-down shirt";
  if (name.includes("black")) return "black button-down shirt";
  if (name.includes("white")) return "white button-down shirt";
  if (name.includes("red")) return "red button-down shirt";
  if (name.includes("blue")) return "blue button-down shirt";
  if (name.includes("green")) return "green button-down shirt";

  return "button-down shirt";
}

/**
 * IDM-VTON garment_des must be SHORT — it becomes
 * "model is wearing [desc]" and "a photo of [desc]".
 * Long preservation prompts break generation and cause wrong garments.
 */
export function buildGarmentDescription(input: {
  garmentFileName?: string | null;
  customPrompt?: string | null;
  analysis?: BodyAnalysis | null;
  fullBodyClothingHint?: string;
}) {
  const garmentName =
    input.fullBodyClothingHint?.trim() ||
    garmentDescriptorFromFileName(input.garmentFileName);

  let desc = `${garmentName}, long sleeve, cotton fabric, natural wrinkles`;

  if (input.customPrompt?.trim()) {
    const note = input.customPrompt.trim().slice(0, 80);
    if (!desc.toLowerCase().includes(note.toLowerCase())) {
      desc += `, ${note}`;
    }
  }

  return desc.slice(0, 200);
}

/** @deprecated Use buildGarmentDescription — IDM-VTON only accepts short garment text. */
export function buildTryOnPrompt(input: Parameters<typeof buildGarmentDescription>[0]) {
  return buildGarmentDescription(input);
}
