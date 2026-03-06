import { GoogleGenAI } from "@google/genai";

// The API key provided by the user as a fallback
const FALLBACK_KEY = "AIzaSyDIaqnseaTGtuBYG5l5G_1eHo4EyNQmxGo";

export const getGeminiKey = () => {
  return process.env.GEMINI_API_KEY || FALLBACK_KEY;
};

export const getGeminiAI = () => {
  const apiKey = getGeminiKey();
  return new GoogleGenAI({ apiKey });
};
