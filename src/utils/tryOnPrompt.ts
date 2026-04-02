import type { BodyAnalysis } from "../types";

function normalizeFileName(name: string | null | undefined) {
  return (name || "").toLowerCase().replace(/\.[a-z0-9]+$/i, "").trim();
}

function garmentDescriptorFromFileName(fileName: string | null | undefined) {
  const name = normalizeFileName(fileName);
  if (!name) return "a stylish shirt";

  // Simple mock logic based on common filename keywords.
  if (name.includes("check") || name.includes("plaid")) return "a blue checkered/plaid shirt";
  if (name.includes("stripe") || name.includes("striped"))
    return "a striped shirt";
  if (name.includes("denim")) return "a denim shirt";
  if (name.includes("black")) return "a black shirt";
  if (name.includes("white")) return "a white shirt";
  if (name.includes("red")) return "a red shirt";
  if (name.includes("blue")) return "a blue shirt";
  if (name.includes("green")) return "a green shirt";
  if (name.includes("yellow")) return "a yellow shirt";

  return "a stylish shirt";
}

export function buildTryOnPrompt(input: {
  garmentFileName?: string | null;
  customPrompt?: string | null;
  analysis?: BodyAnalysis | null;
  fullBodyClothingHint?: string;
}) {
  const descriptor = garmentDescriptorFromFileName(input.garmentFileName);
  const clothingHint = input.fullBodyClothingHint?.trim();

  let prompt =
    `A realistic full body image of a person wearing ${clothingHint || descriptor}, ` +
    `perfect fit, high quality, studio lighting, natural skin, sharp focus, photorealistic.`;

  if (input.analysis?.bodyType) {
    prompt += ` Body type: ${input.analysis.bodyType}.`;
  }
  if (input.analysis?.skinTone) {
    prompt += ` Skin tone: ${input.analysis.skinTone}.`;
  }

  if (input.customPrompt?.trim()) {
    prompt += ` ${input.customPrompt.trim()}`;
  }

  // Make sure it's not empty.
  return prompt.trim() || "A realistic full body image of a person wearing stylish clothing.";
}

