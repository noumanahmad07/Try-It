import { GoogleGenAI } from "@google/genai";
import { buildGarmentDescription } from "../utils/tryOnPrompt";

const IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
] as const;

function getGeminiApiKey(): string {
  return (
    process.env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ""
  ).trim();
}

function toBase64(dataUrl: string): string {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetrySeconds(err: unknown): number {
  const msg = String((err as any)?.message || err);
  const match = msg.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : 25000;
}

/**
 * Gemini image try-on — used when Hugging Face GPU quota is exhausted.
 */
export async function runGeminiVirtualTryOn(
  userImage: string,
  clothImage: string,
  prompt?: string,
  garmentFileName?: string | null,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const garmentDesc =
    prompt?.trim() ||
    buildGarmentDescription({ garmentFileName, customPrompt: null });

  const ai = new GoogleGenAI({ apiKey });
  const parts = [
    { inlineData: { data: toBase64(userImage), mimeType: "image/png" } },
    { inlineData: { data: toBase64(clothImage), mimeType: "image/png" } },
    {
      text:
        `Virtual try-on. Image 1 is the person. Image 2 is the garment (${garmentDesc}). ` +
        "Dress the person in that exact garment. Keep the same face, pose, body, hands, " +
        "background, and lighting. Only replace upper-body clothing. Photorealistic.",
    },
  ];

  let lastError: unknown;
  for (const model of IMAGE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents: { parts } });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
        lastError = new Error(`Gemini (${model}) did not return an image.`);
      } catch (err) {
        lastError = err;
        const status = (err as any)?.status;
        if (status === 429 && attempt === 0) {
          await sleep(parseRetrySeconds(err));
          continue;
        }
        break;
      }
    }
  }

  const msg = String((lastError as any)?.message || lastError || "Unknown error");
  if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
    throw new Error(
      "Gemini image quota is exhausted. Enable billing at https://ai.google.dev/gemini-api/docs/billing or wait for your free tier to reset.",
    );
  }
  throw new Error(`Gemini try-on failed: ${msg.slice(0, 200)}`);
}

export function isGeminiTryOnConfigured(): boolean {
  return !!getGeminiApiKey();
}
