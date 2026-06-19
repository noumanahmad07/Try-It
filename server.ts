import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { InferenceClient } from "@huggingface/inference";
import { runTryOnCascade } from "./src/lib/tryOnCascade.ts";

dotenv.config();
// Load additional local overrides (useful for HF_API_KEY during development).
dotenv.config({ path: ".env.local" });

function getGeminiApiKey() {
  return (
    process.env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ""
  );
}

// Simple in-memory cache to replace Redis
let trendingCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 300 * 1000; // 5 minutes for more "real-time" feel

// Hugging Face Stable Diffusion (img2img/text-to-image) cache
let hfLastCache: { key: string; buffer: Buffer; createdAt: number } | null =
  null;
const HF_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hashImageForCache(dataUrl: string | undefined | null) {
  if (!dataUrl) return "no-image";
  // Avoid hashing huge base64 strings; sample both ends.
  const start = dataUrl.slice(0, 2000);
  const end = dataUrl.slice(Math.max(0, dataUrl.length - 2000));
  return sha256Hex(start + end);
}

async function generateStableDiffusionImageBuffer(input: {
  prompt: string;
  initImage?: string | null;
  clothImage?: string | null;
  force?: boolean;
  seed?: number | null;
}) {
  const hfApiKey = process.env.HF_API_KEY;
  if (!hfApiKey) {
    throw new Error(
      "Hugging Face API key is not configured on the server. Please set HF_API_KEY in .env.",
    );
  }

  const prompt = (input.prompt || "").trim();
  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  const seed =
    typeof input.seed === "number" && Number.isFinite(input.seed)
      ? input.seed
      : Math.floor(Math.random() * 1_000_000_000);

  const guidanceScale = 7.5;
  const numInferenceSteps = 30;
  const width = 512;
  const height = 512;
  const negativePrompt =
    "blurry, deformed, bad anatomy, extra limbs, extra fingers, low quality, watermark, text, logo";

  const hfModelEnv = process.env.HF_MODEL || "stabilityai/stable-diffusion-1-5";
  const hfCandidates = [
    ...(process.env.HF_MODEL_CANDIDATES
      ? process.env.HF_MODEL_CANDIDATES.split(",").map((s) => s.trim())
      : []),
    hfModelEnv,
    // Fallback candidates commonly used for SD1.5.
    "runwayml/stable-diffusion-v1-5",
    "stablediffusionapi/stable-diffusion-v1-5",
    // Extra v1.x fallbacks in case a specific endpoint id changes.
    "CompVis/stable-diffusion-v1-5",
    // If SD1.5 is not available via Inference Providers, fall back to
    // more reliably routed text-to-image models.
    "black-forest-labs/FLUX.1-schnell",
    "ByteDance/SDXL-Lightning",
  ].filter(Boolean);

  const uniqueCandidates = Array.from(new Set(hfCandidates));

  function getCacheKey(modelId: string) {
    return sha256Hex(
      [
        modelId,
        prompt,
        hashImageForCache(input.initImage),
        hashImageForCache(input.clothImage),
      ].join("|"),
    );
  }

  const hfClient = new InferenceClient(hfApiKey);

  const toBuffer = async (img: any): Promise<Buffer> => {
    if (!img) throw new Error("Empty image result from Hugging Face.");
    if (Buffer.isBuffer(img)) return img;
    if (img instanceof ArrayBuffer) return Buffer.from(img);
    if (ArrayBuffer.isView(img)) return Buffer.from(img.buffer);
    if (typeof img.arrayBuffer === "function") {
      const ab = await img.arrayBuffer();
      return Buffer.from(ab);
    }
    if (typeof img.toArrayBuffer === "function") {
      const ab = await img.toArrayBuffer();
      return Buffer.from(ab);
    }
    throw new Error(`Unsupported image type returned by Hugging Face.`);
  };

  async function callHf(modelId: string, _body: any) {
    const image: any = await hfClient.textToImage({
      model: modelId,
      inputs: prompt,
      parameters: {
        negative_prompt: negativePrompt,
        seed,
        guidance_scale: guidanceScale,
        num_inference_steps: numInferenceSteps,
        width,
        height,
      },
      provider: "auto",
    } as any);

    return toBuffer(image);
  }

  // Stable Diffusion text-to-image is the most reliable with the HF Inference API.
  const payloadVariants: any[] = [
    {
      inputs: prompt,
      parameters: {
        negative_prompt: negativePrompt,
        seed,
        guidance_scale: guidanceScale,
        num_inference_steps: numInferenceSteps,
        width,
        height,
      },
    },
    // Some models accept prompt + params at the top-level "inputs" object.
    {
      inputs: {
        prompt,
        negative_prompt: negativePrompt,
        seed,
        guidance_scale: guidanceScale,
        num_inference_steps: numInferenceSteps,
        width,
        height,
      },
    },
    // Minimal request (some models ignore/ reject parameters).
    { inputs: prompt },
  ];

  let lastErr: any = null;
  for (const modelId of uniqueCandidates) {
    const cacheKey = getCacheKey(modelId);
    if (!input.force && hfLastCache && hfLastCache.key === cacheKey) {
      if (Date.now() - hfLastCache.createdAt < HF_CACHE_TTL_MS) {
        return hfLastCache.buffer;
      }
    }

    for (const body of payloadVariants) {
      try {
        const buffer = await callHf(modelId, body);
        hfLastCache = { key: cacheKey, buffer, createdAt: Date.now() };
        return buffer;
      } catch (e: any) {
        const status = e?.response?.status;
        const msg = e?.message ? `message=${e.message}` : "";
        const respData = e?.response?.data;
        let detail = "";
        if (typeof respData === "string") {
          detail = respData;
        } else if (respData instanceof ArrayBuffer) {
          detail = Buffer.from(respData).toString("utf-8");
        } else if (Buffer.isBuffer(respData)) {
          detail = respData.toString("utf-8");
        } else if (respData && typeof respData === "object") {
          try {
            detail = JSON.stringify(respData);
          } catch {
            detail = "";
          }
        }

        lastErr = new Error(
          `Hugging Face request failed (model=${modelId}). ` +
            `status=${status || "unknown"} ${msg} ${detail ? `details=${detail}` : ""}`,
        );

        // If the model isn't available, try the next model ID.
        if (status === 410 || status === 404) break;

        // Otherwise try the next payload variant.
        continue;
      }
    }
  }

  throw lastErr || new Error("Hugging Face image generation failed.");
}

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  return { buffer, mimeType };
}

function extractGarmentPromptFromTryOnPrompt(prompt: string) {
  const p = (prompt || "").trim();
  // buildTryOnPrompt uses: "... person wearing ${descriptor}, perfect fit ..."
  const startToken = " wearing ";
  const endToken = ", perfect fit";
  const startIdx = p.indexOf(startToken);
  const endIdx = p.indexOf(endToken);
  if (startIdx >= 0) {
    const desc =
      endIdx > startIdx ? p.slice(startIdx + startToken.length, endIdx) : "";
    if (desc.trim()) return desc.trim();
  }
  return p.length > 120 ? p.slice(0, 120).trim() : p || "a stylish garment";
}

// Virtual Trial Job Store
const virtualTrialJobs: Record<string, any> = {};

// Keywords to exclude to ensure we only show real dresses/clothing
const EXCLUDE_KEYWORDS = [
  "sketch",
  "painting",
  "drawing",
  "illustration",
  "art",
  "artwork",
  "glasses",
  "eyewear",
  "sunglasses",
  "portrait",
  "close-up",
  "face",
  "makeup",
  "accessory",
  "jewelry",
  "mannequin",
  "hanger",
  "flat lay",
  "watch",
  "shoes",
  "bag",
  "handbag",
  "purse",
  "hat",
  "cap",
];

function isValidFashionImage(item: any) {
  const text = (
    item.title +
    " " +
    (item.description || "") +
    " " +
    (item.alt_description || "") +
    " " +
    (item.tags || "")
  ).toLowerCase();
  return !EXCLUDE_KEYWORDS.some((keyword) => text.includes(keyword));
}

// Hairstyle Bot Logic
const HAIRSTYLE_SEARCH_TERMS: any = {
  male: {
    long: [
      "man long hair style",
      "male long hairstyle",
      "men long haircut",
      "man bun style",
    ],
    short: [
      "man short haircut",
      "male fade haircut",
      "men short style",
      "pompadour men",
    ],
    trendy: [
      "men trendy haircut 2025",
      "male modern hairstyle",
      "men fashion haircut",
    ],
  },
  female: {
    long: [
      "woman long hair style",
      "female long hairstyle",
      "long straight hair",
      "long wavy hair",
    ],
    short: [
      "woman short haircut",
      "female pixie cut",
      "bob haircut women",
      "short layered hair",
    ],
    trendy: [
      "women trendy haircut 2025",
      "female modern hairstyle",
      "women fashion haircut",
    ],
  },
};

async function fetchHairstylesFromAPIs(gender: string, category: string) {
  const genderKey = gender === "male" ? "male" : "female";
  const catKey = category.toLowerCase();
  const searchTerms = HAIRSTYLE_SEARCH_TERMS[genderKey]?.[catKey] || [
    `${gender} ${category} hairstyle`,
  ];
  const searchTerm =
    searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const results = await Promise.all([
    fetchUnsplashHairstyles(searchTerm, gender, category),
    fetchPexelsHairstyles(searchTerm, gender, category),
    fetchPixabayHairstyles(searchTerm, gender, category),
  ]);

  return results.flat().sort(() => Math.random() - 0.5);
}

async function fetchUnsplashHairstyles(
  query: string,
  gender: string,
  category: string,
) {
  if (!process.env.UNSPLASH_ACCESS_KEY) return [];
  try {
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query,
        per_page: 10,
        orientation: "portrait",
        client_id: process.env.UNSPLASH_ACCESS_KEY,
      },
      timeout: 5000,
    });
    return response.data.results.map((photo: any) => ({
      id: `unsplash-${photo.id}`,
      name: (
        photo.alt_description ||
        photo.description ||
        `${gender} ${category}`
      )
        .split(/[.!?\n]/)[0]
        .substring(0, 30),
      category: category,
      gender: gender,
      imageUrl: photo.urls.regular,
      description:
        photo.description || `A stylish ${category} hairstyle for ${gender}.`,
      source: "unsplash",
    }));
  } catch (e) {
    return [];
  }
}

async function fetchPexelsHairstyles(
  query: string,
  gender: string,
  category: string,
) {
  if (!process.env.PEXELS_API_KEY) return [];
  try {
    const response = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params: { query, per_page: 10, orientation: "portrait" },
      timeout: 5000,
    });
    return response.data.photos.map((photo: any) => ({
      id: `pexels-${photo.id}`,
      name: `${gender} ${category} Style`,
      category: category,
      gender: gender,
      imageUrl: photo.src.large,
      description: `Professional ${category} hairstyle photography.`,
      source: "pexels",
    }));
  } catch (e) {
    return [];
  }
}

async function fetchPixabayHairstyles(
  query: string,
  gender: string,
  category: string,
) {
  if (!process.env.PIXABAY_API_KEY) return [];
  try {
    const response = await axios.get("https://pixabay.com/api/", {
      params: {
        key: process.env.PIXABAY_API_KEY,
        q: query,
        image_type: "photo",
        per_page: 10,
        orientation: "vertical",
      },
      timeout: 5000,
    });
    return response.data.hits.map((photo: any) => ({
      id: `pixabay-${photo.id}`,
      name: (photo.tags || `${gender} ${category}`).split(",")[0],
      category: category,
      gender: gender,
      imageUrl: photo.largeImageURL,
      description: `Trendy ${category} look from Pixabay.`,
      source: "pixabay",
    }));
  } catch (e) {
    return [];
  }
}

const FASHION_SEARCH_QUERIES = {
  men: [
    "pakistani shalwar kameez clothing",
    "pakistani kurta garment",
    "pakistani waistcoat clothing",
    "pakistani sherwani outfit",
    "pakistani pathani suit dress",
    "pakistani men's clothing",
    "pakistani traditional attire",
    "pakistani ethnic wear men",
    "pakistani formal outfit",
    "pakistani designer kurta",
    "pakistani linen shirt clothing",
    "pakistani cotton garment",
  ],
  women: [
    "pakistani shalwar kameez dress",
    "pakistani lawn suit clothing",
    "pakistani anarkali outfit",
    "pakistani frock garment",
    "pakistani maxi dress clothing",
    "pakistani chiffon suit",
    "pakistani silk dress outfit",
    "pakistani cotton suit dress",
    "pakistani party wear clothing",
    "pakistani formal dress garment",
    "pakistani designer outfit",
    "pakistani casual dress clothing",
    "pakistani summer collection dress",
  ],
  bridal: [
    "pakistani lehenga clothing",
    "pakistani bridal dress outfit",
    "pakistani wedding garment",
    "pakistani sharara dress",
    "pakistani gharara outfit",
    "pakistani bridal lehenga choli",
    "pakistani wedding gown dress",
    "pakistani mehndi outfit",
    "pakistani barat dress clothing",
    "pakistani walima garment",
    "pakistani heavy embroidery dress",
    "pakistani designer bridal outfit",
    "pakistani red wedding dress",
    "pakistani gold bridal garment",
  ],
  casual: [
    "pakistani cotton suit clothing",
    "pakistani lawn collection dress",
    "pakistani casual outfit",
    "pakistani summer suit garment",
    "pakistani linen dress",
    "pakistani printed suit clothing",
    "pakistani block print outfit",
    "pakistani digital print dress",
    "pakistani kurti garment",
    "pakistani daily wear clothing",
    "pakistani simple dress",
    "pakistani office outfit",
    "pakistani comfortable garment",
  ],
  formal: [
    "pakistani formal suit clothing",
    "pakistani party wear dress",
    "pakistani luxury pret outfit",
    "pakistani evening dress garment",
    "pakistani silk suit clothing",
    "pakistani formal gown dress",
    "pakistani cocktail outfit",
    "pakistani designer party wear",
    "pakistani business suit clothing",
    "pakistani dinner dress garment",
    "pakistani reception outfit",
    "pakistani elegant dress clothing",
  ],
  traditional: [
    "pakistani traditional dress clothing",
    "pakistani cultural outfit garment",
    "pakistani eid collection dress",
    "pakistani jamawar outfit",
    "pakistani heritage clothing",
    "pakistani festival wear dress",
    "pakistani ethnic garment",
    "pakistani classic outfit",
    "pakistani vintage dress clothing",
    "pakistani folk attire garment",
    "pakistani regional dress outfit",
  ],
};

async function fetchUnsplashTrending() {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.log("Unsplash API key missing, skipping...");
    return [];
  }
  try {
    const categories = Object.keys(FASHION_SEARCH_QUERIES);
    const allResults = [];

    // Make 3 different queries to get more variety
    for (let i = 0; i < 3; i++) {
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];
      const categoryQueries =
        FASHION_SEARCH_QUERIES[
          randomCategory as keyof typeof FASHION_SEARCH_QUERIES
        ];
      const randomQuery =
        categoryQueries[Math.floor(Math.random() * categoryQueries.length)];

      const response = await axios.get(
        "https://api.unsplash.com/search/photos",
        {
          params: {
            query: `fashion ${randomQuery} full body`,
            per_page: 20, // 20 per query, total 60
            order_by: "latest",
            client_id: process.env.UNSPLASH_ACCESS_KEY,
          },
          timeout: 8000,
        },
      );

      // Add the query used to each photo for proper titling
      const photosWithQuery = response.data.results.map((photo: any) => ({
        ...photo,
        searchQuery: randomQuery,
      }));

      allResults.push(...photosWithQuery);
    }
    return allResults
      .map((photo: any) => ({
        id: photo.id,
        source: "unsplash",
        image_url: photo.urls.regular,
        thumb_url: photo.urls.thumb,
        title:
          (photo.alt_description || photo.description || photo.searchQuery)
            .split(/[.!?\n]/)[0]
            .substring(0, 50)
            .replace(/https?:\/\/\S+/g, "")
            .trim() ||
          photo.searchQuery ||
          "Fashion Trend",
        likes: photo.likes,
        downloads: photo.downloads || 0,
        trend_score: photo.likes * 10,
        photographer: photo.user.name,
        photographer_url: photo.user.links.html,
        date: photo.created_at,
        description: photo.description,
        alt_description: photo.alt_description,
      }))
      .filter(isValidFashionImage);
  } catch (e) {
    console.error("Unsplash error:", e);
    return [];
  }
}

async function fetchPexelsFashion() {
  if (!process.env.PEXELS_API_KEY) {
    console.log("Pexels API key missing, skipping...");
    return [];
  }
  try {
    const categories = Object.keys(FASHION_SEARCH_QUERIES);
    const allResults = [];

    // Make 3 different queries to get more variety
    for (let i = 0; i < 3; i++) {
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];
      const categoryQueries =
        FASHION_SEARCH_QUERIES[
          randomCategory as keyof typeof FASHION_SEARCH_QUERIES
        ];
      const randomQuery =
        categoryQueries[Math.floor(Math.random() * categoryQueries.length)];

      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: {
          query: `fashion ${randomQuery}`,
          per_page: 20, // 20 per query, total 60
          orientation: "portrait",
        },
        timeout: 8000,
      });

      // Add the query used to each photo for proper titling
      const photosWithQuery = response.data.photos.map((photo: any) => ({
        ...photo,
        searchQuery: randomQuery,
      }));

      allResults.push(...photosWithQuery);
    }
    return allResults
      .map((photo: any) => ({
        id: photo.id,
        source: "pexels",
        image_url: photo.src.large,
        thumb_url: photo.src.medium,
        title: `${photo.searchQuery.charAt(0).toUpperCase() + photo.searchQuery.slice(1)} by ${photo.photographer}`,
        likes: 0,
        downloads: 0,
        trend_score: 500,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        date: new Date().toISOString(),
        description: photo.alt || "",
      }))
      .filter(isValidFashionImage);
  } catch (e) {
    console.error("Pexels error:", e);
    return [];
  }
}

async function fetchPixabayFashion() {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
    console.log("Pixabay API key missing, skipping...");
    return [];
  }
  try {
    const categories = Object.keys(FASHION_SEARCH_QUERIES);
    const allResults = [];

    // Make 3 different queries to get more variety
    for (let i = 0; i < 3; i++) {
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];
      const categoryQueries =
        FASHION_SEARCH_QUERIES[
          randomCategory as keyof typeof FASHION_SEARCH_QUERIES
        ];
      const randomQuery =
        categoryQueries[Math.floor(Math.random() * categoryQueries.length)];

      const response = await axios.get("https://pixabay.com/api/", {
        params: {
          key: key,
          q: `fashion+${randomQuery.replace(/ /g, "+")}`,
          image_type: "photo",
          per_page: 20, // 20 per query, total 60
          order: "latest",
        },
        timeout: 5000, // Add timeout to prevent hanging
      });

      if (!response.data || !response.data.hits) {
        continue;
      }

      // Add the query used to each photo for proper titling
      const photosWithQuery = response.data.hits.map((photo: any) => ({
        ...photo,
        searchQuery: randomQuery,
      }));

      allResults.push(...photosWithQuery);
    }

    return allResults
      .map((photo: any) => ({
        id: photo.id,
        source: "pixabay",
        image_url: photo.largeImageURL,
        thumb_url: photo.previewURL,
        title: photo.searchQuery || (photo.tags || "Fashion").split(",")[0],
        likes: photo.likes,
        downloads: photo.downloads,
        trend_score: photo.likes * 5 + photo.downloads,
        photographer: photo.user,
        photographer_url: `https://pixabay.com/users/${photo.user}-${photo.user_id}/`,
        date: new Date().toISOString(),
        description: photo.tags || "",
      }))
      .filter(isValidFashionImage);
  } catch (e: any) {
    // Silently handle 400 errors which usually mean invalid key
    if (e.response && e.response.status === 400) {
      console.warn(
        "Pixabay API returned 400 (likely invalid key). Skipping Pixabay results.",
      );
    } else {
      console.error("Pixabay error:", e.message || e);
    }
    return [];
  }
}

async function getTrendingFast() {
  // If no keys are provided, use high-quality mock data to ensure the UI is populated
  const hasKeys =
    process.env.UNSPLASH_ACCESS_KEY ||
    process.env.PEXELS_API_KEY ||
    process.env.PIXABAY_API_KEY;

  const mockTrends = [
    // Men
    {
      id: "mock-1",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Shalwar Kameez Men",
      likes: 1240,
      downloads: 450,
      trend_score: 950,
      photographer: "Fashion Curator",
      date: new Date().toISOString(),
    },
    {
      id: "mock-2",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Kurta Boys",
      likes: 890,
      downloads: 210,
      trend_score: 820,
      photographer: "Style Bot",
      date: new Date().toISOString(),
    },
    // Women
    {
      id: "mock-3",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Shalwar Kameez Women",
      likes: 2100,
      downloads: 800,
      trend_score: 980,
      photographer: "Trend Hunter",
      date: new Date().toISOString(),
    },
    {
      id: "mock-4",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Lawn Suit Girls",
      likes: 1500,
      downloads: 300,
      trend_score: 880,
      photographer: "Office Style",
      date: new Date().toISOString(),
    },
    // Bridal
    {
      id: "mock-5",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Bridal Lehenga",
      likes: 3200,
      downloads: 1200,
      trend_score: 995,
      photographer: "Luxury Trends",
      date: new Date().toISOString(),
    },
    {
      id: "mock-6",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Sharara Dress",
      likes: 1800,
      downloads: 600,
      trend_score: 920,
      photographer: "Casual Wear",
      date: new Date().toISOString(),
    },
    // Casual
    {
      id: "mock-7",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Cotton Suit",
      likes: 2500,
      downloads: 900,
      trend_score: 960,
      photographer: "Formal Collection",
      date: new Date().toISOString(),
    },
    {
      id: "mock-8",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Pant Shirt",
      likes: 1900,
      downloads: 700,
      trend_score: 910,
      photographer: "Evening Style",
      date: new Date().toISOString(),
    },
    // Formal
    {
      id: "mock-9",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Formal Suit",
      likes: 2800,
      downloads: 1000,
      trend_score: 975,
      photographer: "Cultural Heritage",
      date: new Date().toISOString(),
    },
    // Traditional
    {
      id: "mock-10",
      source: "mirrorfit",
      image_url:
        "https://images.unsplash.com/photo-1475180098004-ca77a650455c?auto=format&fit=crop&w=800&q=80",
      thumb_url:
        "https://images.unsplash.com/photo-1475180098004-ca77a650455c?auto=format&fit=crop&w=200&q=80",
      title: "Pakistani Traditional Dress",
      likes: 2100,
      downloads: 850,
      trend_score: 940,
      photographer: "Regional Fashion",
      date: new Date().toISOString(),
    },
  ];

  if (!hasKeys) {
    console.log("No fashion API keys found, using mock data...");
    return mockTrends;
  }

  const results = await Promise.all([
    fetchUnsplashTrending(),
    fetchPexelsFashion(),
    fetchPixabayFashion(),
  ]);

  const allItems = results.flat();

  // If all APIs failed or returned nothing, use mock data
  if (allItems.length === 0) {
    console.log("All fashion APIs returned empty results, using mock data...");
    return mockTrends;
  }

  // Ensure variety by limiting items from the same photographer and shuffling
  const uniqueItems: any[] = [];
  const seenPhotographers = new Set();

  // Shuffle all items first
  const shuffledItems = allItems.sort(() => Math.random() - 0.5);

  for (const item of shuffledItems) {
    const photographerKey = `${item.source}-${item.photographer}`;
    // Allow max 2 items from the same photographer to ensure variety
    const count = uniqueItems.filter(
      (i) => `${i.source}-${i.photographer}` === photographerKey,
    ).length;
    if (count < 2) {
      uniqueItems.push(item);
    }
    if (uniqueItems.length >= 150) break;
  }

  uniqueItems.sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0));

  const now = new Date().toISOString();
  return uniqueItems.map((item) => ({ ...item, fetched_at: now }));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  // Virtual Trial APIs (Ported from Python structure)
  app.post("/api/virtual-trial/upload", async (req, res) => {
    try {
      const { user_image, cloth_image, prompt, garment_file_name, force_generate } = req.body;
      if (!user_image || !cloth_image) {
        return res
          .status(400)
          .json({ error: "Both user_image and cloth_image are required" });
      }

      const job_id = Math.random().toString(36).substring(2, 15);
      virtualTrialJobs[job_id] = {
        id: job_id,
        status: "uploaded",
        user_image,
        cloth_image,
        prompt: typeof prompt === "string" ? prompt : "",
        garment_file_name:
          typeof garment_file_name === "string" ? garment_file_name : "",
        force_generate: !!force_generate,
        created_at: new Date().toISOString(),
      };

      res.json({
        job_id,
        message: "Images uploaded successfully",
        status: "uploaded",
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/virtual-trial/process/:job_id", async (req, res) => {
    const { job_id } = req.params;
    const job = virtualTrialJobs[job_id];

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status === "processing") {
      return res.json({
        job_id,
        status: "processing",
        message: "Job already processing",
      });
    }

    if (job.status === "completed") {
      return res.json({
        job_id,
        status: "completed",
        message: "Job already completed",
      });
    }

    job.status = "processing";

    // Local Python compositor — no external AI APIs.
    void (async () => {
      try {
        console.log(`Running AI try-on cascade for job ${job_id}...`);
        const result = await runTryOnCascade({
          userImage: job.user_image,
          clothImage: job.cloth_image,
          prompt: job.prompt || "",
          garmentFileName: job.garment_file_name || null,
        });

        job.status = "completed";
        job.result_url = result.dataUrl;
        job.engine = result.engine;
        job.note = result.note;
        job.completed_at = new Date().toISOString();
      } catch (err: any) {
        console.warn("Try-on failed:", err?.message);
        job.status = "failed";
        job.error = err?.message || "AI try-on failed.";
        job.completed_at = new Date().toISOString();
      }
    })();

    res.json({ job_id, status: "processing", message: "Processing started" });
  });

  app.get("/api/virtual-trial/status/:job_id", (req, res) => {
    const { job_id } = req.params;
    const job = virtualTrialJobs[job_id];
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({
      job_id,
      status: job.status,
      created_at: job.created_at,
      completed_at: job.completed_at,
      error: job.error,
      note: job.note,
      engine: job.engine,
    });
  });

  app.get("/api/virtual-trial/result/:job_id", (req, res) => {
    const { job_id } = req.params;
    const job = virtualTrialJobs[job_id];
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "completed")
      return res.status(400).json({ error: "Job not completed" });

    // Return the base64 image as a response
    const base64Data = job.result_url.split(",")[1];
    const img = Buffer.from(base64Data, "base64");
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length,
    });
    res.end(img);
  });

  app.post("/api/virtual-trial/preview", async (req, res) => {
    try {
      const { user_image, cloth_image } = req.body;
      const apiKey = getGeminiApiKey();
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });

      const userBase64 = user_image.split(",")[1] || user_image;
      const clothBase64 = cloth_image.split(",")[1] || cloth_image;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
          parts: [
            { inlineData: { data: userBase64, mimeType: "image/png" } },
            { inlineData: { data: clothBase64, mimeType: "image/png" } },
            {
              text: "Quick virtual try-on preview. Put the garment on the person.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      });

      let previewUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          previewUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      res.json({ preview: previewUrl, message: "Preview generated" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/virtual-trial/history", (req, res) => {
    const history = Object.values(virtualTrialJobs).map((job) => ({
      job_id: job.id,
      status: job.status,
      created_at: job.created_at,
      completed_at: job.completed_at,
      has_result: !!job.result_url,
    }));
    res.json({ history });
  });

  // Hugging Face Stable Diffusion Image Generation
  // POST /generate
  // Accepts: { prompt: string, init_image?: string, cloth_image?: string, force_generate?: boolean, seed?: number }
  app.post("/generate", async (req, res) => {
    try {
      const {
        prompt,
        init_image,
        user_image,
        cloth_image,
        force_generate,
        seed,
      } = req.body || {};

      const buffer = await generateStableDiffusionImageBuffer({
        prompt: (prompt || "").toString(),
        initImage: init_image || user_image || null,
        clothImage: cloth_image || null,
        force: !!force_generate,
        seed: typeof seed === "number" ? seed : null,
      });

      res.setHeader("Content-Type", "image/png");
      res.status(200).send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to generate image" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Routes
  app.get("/api/trending/fast", async (req, res) => {
    try {
      const { page = 1, limit = 20, category } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const now = Date.now();
      const cacheKey = `trending_${category || "all"}_${pageNum}_${limitNum}`;

      // Use cache if available and fresh
      if (trendingCache && now - cacheTimestamp < CACHE_DURATION && !category) {
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedItems = trendingCache.trending_items.slice(
          startIndex,
          endIndex,
        );

        return res.json({
          ...trendingCache,
          trending_items: paginatedItems,
          cached: true,
          page: pageNum,
          limit: limitNum,
          total: trendingCache.trending_items.length,
          hasMore: endIndex < trendingCache.trending_items.length,
        });
      }

      const trendingItems = await getTrendingFast();

      // Filter by category if specified
      let filteredItems = trendingItems;
      if (category && category !== "all") {
        filteredItems = trendingItems.filter((item) =>
          item.title.toLowerCase().includes((category as string).toLowerCase()),
        );
      }

      // Pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedItems = filteredItems.slice(startIndex, endIndex);

      const responseData = {
        last_updated: new Date().toISOString(),
        trending_items: paginatedItems,
        cached: false,
        page: pageNum,
        limit: limitNum,
        total: filteredItems.length,
        hasMore: endIndex < filteredItems.length,
        count: paginatedItems.length,
      };

      // Cache only the first page without category filter
      if (pageNum === 1 && !category) {
        trendingCache = {
          ...responseData,
          trending_items: filteredItems,
        };
        cacheTimestamp = now;
      }

      res.json(responseData);
    } catch (e: any) {
      res.status(500).json({ error: e.message, cached: false });
    }
  });

  app.get("/api/hairstyles", async (req, res) => {
    try {
      const { gender = "female", category = "Trendy" } = req.query;
      const styles = await fetchHairstylesFromAPIs(
        gender as string,
        category as string,
      );

      // If no results from APIs, fallback to some high-quality defaults
      if (styles.length === 0) {
        const defaults = [
          {
            id: "def-1",
            name: "Classic Elegance",
            category: category as string,
            gender: gender as string,
            imageUrl:
              "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=800&q=80",
            description: "A timeless look that never goes out of style.",
          },
          {
            id: "def-2",
            name: "Modern Chic",
            category: category as string,
            gender: gender as string,
            imageUrl:
              "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80",
            description: "Perfect for the modern fashion-forward individual.",
          },
        ];
        return res.json({
          hairstyles: defaults,
          count: defaults.length,
          source: "fallback",
        });
      }

      res.json({
        hairstyles: styles,
        count: styles.length,
        source: "api",
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/trending/refresh", async (req, res) => {
    try {
      trendingCache = null;
      const trendingItems = await getTrendingFast();
      const responseData = {
        last_updated: new Date().toISOString(),
        trending_items: trendingItems,
        cached: false,
        count: trendingItems.length,
      };
      trendingCache = responseData;
      cacheTimestamp = Date.now();
      res.json({
        message: "Trending data refreshed",
        count: trendingItems.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API for similar garments based on uploaded image
  app.post("/api/similar-garments", async (req, res) => {
    try {
      const { imageUrl, category, limit = 10 } = req.body;

      // Extract keywords from the image URL or title to find similar items
      const allItems = await getTrendingFast();

      let similarItems = allItems;

      // If category is specified, filter by it
      if (category && category !== "all") {
        similarItems = allItems.filter((item) =>
          item.title.toLowerCase().includes(category.toLowerCase()),
        );
      }

      // Simple similarity based on title keywords
      if (imageUrl) {
        // Extract potential keywords from the image URL or use category-based matching
        const keywords = category ? [category.toLowerCase()] : [];

        similarItems = similarItems.filter((item) => {
          const titleLower = item.title.toLowerCase();
          return (
            keywords.some((keyword) => titleLower.includes(keyword)) ||
            item.source === "unsplash" ||
            item.source === "pexels"
          ); // Prioritize quality sources
        });
      }

      // Sort by trend score and limit results
      similarItems.sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0));
      const limitedItems = similarItems.slice(0, parseInt(limit));

      res.json({
        similar_items: limitedItems,
        count: limitedItems.length,
        category: category || "all",
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tryon", async (req, res) => {
    try {
      const { person_image, garment_image } = req.body;
      if (!person_image || !garment_image) {
        return res
          .status(400)
          .json({ error: "Both person_image and garment_image are required" });
      }

      console.log("Starting AI virtual try-on cascade...");
      const result = await runTryOnCascade({
        userImage: person_image,
        clothImage: garment_image,
        prompt: typeof req.body.prompt === "string" ? req.body.prompt : "",
        garmentFileName: null,
      });
      res.json({
        result: result.dataUrl,
        engine: result.engine,
        note: result.note,
      });
    } catch (e: any) {
      console.error("Virtual Try-On Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // API 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
