import { GoogleGenAI } from "@google/genai";

export const getGeminiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === "string" ? key.trim() : "";
};

export const getGeminiAI = () => {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment."
    );
  }
  return new GoogleGenAI({ apiKey });
};

export const isGeminiConfigured = () => {
  const key = getGeminiKey();
  // Treat the example placeholder as "not configured"
  if (!key || key === "MY_GEMINI_API_KEY") return false;
  return true;
};
