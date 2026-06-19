import { runFashnVirtualTryOn, isFashnTryOnConfigured } from "./fashnTryOn";
import { runFreeVirtualTryOn } from "./freeTryOn";
import {
  isGeminiTryOnConfigured,
  runGeminiVirtualTryOn,
} from "./geminiTryOn";

export type TryOnCascadeResult = {
  dataUrl: string;
  engine: string;
  note: string;
};

async function tryFashn(
  userImage: string,
  clothImage: string,
): Promise<TryOnCascadeResult | null> {
  if (!isFashnTryOnConfigured()) return null;
  try {
    const dataUrl = await runFashnVirtualTryOn(userImage, clothImage);
    return {
      dataUrl,
      engine: "fashn",
      note: "AI try-on complete (FASHN)",
    };
  } catch (err: any) {
    console.warn("FASHN try-on failed:", err?.message);
    return null;
  }
}

async function tryGemini(
  userImage: string,
  clothImage: string,
  prompt: string,
  garmentFileName: string | null,
): Promise<TryOnCascadeResult | null> {
  if (!isGeminiTryOnConfigured()) return null;
  try {
    const dataUrl = await runGeminiVirtualTryOn(
      userImage,
      clothImage,
      prompt,
      garmentFileName,
    );
    return {
      dataUrl,
      engine: "gemini",
      note: "AI try-on complete (Gemini)",
    };
  } catch (err: any) {
    console.warn("Gemini try-on failed:", err?.message);
    return null;
  }
}

/**
 * Free try-on cascade: Hugging Face → Gemini → basic preview.
 * FASHN is optional paid fallback — only used if FASHN_API_KEY is set (~$7.50+ credits).
 */
export async function runTryOnCascade(input: {
  userImage: string;
  clothImage: string;
  prompt: string;
  garmentFileName: string | null;
}): Promise<TryOnCascadeResult> {
  const { userImage, clothImage, prompt, garmentFileName } = input;

  let hfResult: Awaited<ReturnType<typeof runFreeVirtualTryOn>> | null = null;
  try {
    hfResult = await runFreeVirtualTryOn(
      userImage,
      clothImage,
      prompt,
      garmentFileName,
    );
    if (hfResult.engine === "free_gradio") {
      return {
        dataUrl: hfResult.dataUrl,
        engine: "free_gradio",
        note: hfResult.warning || "AI try-on complete (Hugging Face)",
      };
    }
  } catch (err: any) {
    console.warn("HF try-on failed:", err?.message);
  }

  const gemini = await tryGemini(userImage, clothImage, prompt, garmentFileName);
  if (gemini) return gemini;

  // Paid optional — only if user explicitly added FASHN_API_KEY
  const fashn = await tryFashn(userImage, clothImage);
  if (fashn) return fashn;

  if (hfResult?.engine === "local_fallback") {
    const aiConfigured =
      isGeminiTryOnConfigured() || isFashnTryOnConfigured();
    if (aiConfigured) {
      throw new Error(
        "AI try-on is temporarily unavailable. Hugging Face GPU quota is full and Gemini quota is exhausted. " +
          "Wait ~24 hours for free quota reset, then try again.",
      );
    }
    return {
      dataUrl: hfResult.dataUrl,
      engine: "local_fallback",
      note:
        hfResult.warning ||
        "Basic preview only — free AI quota is full. Wait ~24h for Hugging Face reset, or fork IDM-VTON on Hugging Face for your own GPU quota.",
    };
  }

  throw new Error(
    "Free AI try-on is unavailable right now. Hugging Face GPU quota resets daily (~24h). " +
      "Tip: duplicate yisol/IDM-VTON to your Hugging Face account for extra free GPU minutes.",
  );
}
