import express from "express";
import { createServer as createViteServer } from "vite";
import Replicate from "replicate";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const replicate = process.env.REPLICATE_API_TOKEN 
  ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  : null;

// Simple in-memory cache to replace Redis
let trendingCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 300 * 1000; // 5 minutes for more "real-time" feel

// Virtual Trial Job Store
const virtualTrialJobs: Record<string, any> = {};

// Keywords to exclude to ensure we only show real dresses/clothing
const EXCLUDE_KEYWORDS = [
  'sketch', 'painting', 'drawing', 'illustration', 'art', 'artwork', 
  'glasses', 'eyewear', 'sunglasses', 'portrait', 'close-up', 'face', 
  'makeup', 'accessory', 'jewelry', 'mannequin', 'hanger', 'flat lay',
  'watch', 'shoes', 'bag', 'handbag', 'purse', 'hat', 'cap'
];

function isValidFashionImage(item: any) {
  const text = (item.title + ' ' + (item.description || '') + ' ' + (item.alt_description || '') + ' ' + (item.tags || '')).toLowerCase();
  return !EXCLUDE_KEYWORDS.some(keyword => text.includes(keyword));
}

// Hairstyle Bot Logic
const HAIRSTYLE_SEARCH_TERMS: any = {
  male: {
    long: ['man long hair style', 'male long hairstyle', 'men long haircut', 'man bun style'],
    short: ['man short haircut', 'male fade haircut', 'men short style', 'pompadour men'],
    trendy: ['men trendy haircut 2025', 'male modern hairstyle', 'men fashion haircut']
  },
  female: {
    long: ['woman long hair style', 'female long hairstyle', 'long straight hair', 'long wavy hair'],
    short: ['woman short haircut', 'female pixie cut', 'bob haircut women', 'short layered hair'],
    trendy: ['women trendy haircut 2025', 'female modern hairstyle', 'women fashion haircut']
  }
};

async function fetchHairstylesFromAPIs(gender: string, category: string) {
  const genderKey = gender === 'male' ? 'male' : 'female';
  const catKey = category.toLowerCase();
  const searchTerms = HAIRSTYLE_SEARCH_TERMS[genderKey]?.[catKey] || [ `${gender} ${category} hairstyle` ];
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const results = await Promise.all([
    fetchUnsplashHairstyles(searchTerm, gender, category),
    fetchPexelsHairstyles(searchTerm, gender, category),
    fetchPixabayHairstyles(searchTerm, gender, category)
  ]);

  return results.flat().sort(() => Math.random() - 0.5);
}

async function fetchUnsplashHairstyles(query: string, gender: string, category: string) {
  if (!process.env.UNSPLASH_ACCESS_KEY) return [];
  try {
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query,
        per_page: 10,
        orientation: 'portrait',
        client_id: process.env.UNSPLASH_ACCESS_KEY
      },
      timeout: 5000
    });
    return response.data.results.map((photo: any) => ({
      id: `unsplash-${photo.id}`,
      name: (photo.alt_description || photo.description || `${gender} ${category}`).split(/[.!?\n]/)[0].substring(0, 30),
      category: category,
      gender: gender,
      imageUrl: photo.urls.regular,
      description: photo.description || `A stylish ${category} hairstyle for ${gender}.`,
      source: 'unsplash'
    }));
  } catch (e) { return []; }
}

async function fetchPexelsHairstyles(query: string, gender: string, category: string) {
  if (!process.env.PEXELS_API_KEY) return [];
  try {
    const response = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params: { query, per_page: 10, orientation: 'portrait' },
      timeout: 5000
    });
    return response.data.photos.map((photo: any) => ({
      id: `pexels-${photo.id}`,
      name: `${gender} ${category} Style`,
      category: category,
      gender: gender,
      imageUrl: photo.src.large,
      description: `Professional ${category} hairstyle photography.`,
      source: 'pexels'
    }));
  } catch (e) { return []; }
}

async function fetchPixabayHairstyles(query: string, gender: string, category: string) {
  if (!process.env.PIXABAY_API_KEY) return [];
  try {
    const response = await axios.get("https://pixabay.com/api/", {
      params: {
        key: process.env.PIXABAY_API_KEY,
        q: query,
        image_type: 'photo',
        per_page: 10,
        orientation: 'vertical'
      },
      timeout: 5000
    });
    return response.data.hits.map((photo: any) => ({
      id: `pixabay-${photo.id}`,
      name: (photo.tags || `${gender} ${category}`).split(',')[0],
      category: category,
      gender: gender,
      imageUrl: photo.largeImageURL,
      description: `Trendy ${category} look from Pixabay.`,
      source: 'pixabay'
    }));
  } catch (e) { return []; }
}

const FASHION_SEARCH_QUERIES = [
  'floral summer dress',
  'elegant evening gown',
  'bohemian maxi dress',
  'modern silk slip dress',
  'casual linen dress',
  'chic cocktail dress',
  'vintage style dress',
  'minimalist midi dress',
  'urban streetwear outfit',
  'business casual blazer dress'
];

async function fetchUnsplashTrending() {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.log("Unsplash API key missing, skipping...");
    return [];
  }
  try {
    const randomQuery = FASHION_SEARCH_QUERIES[Math.floor(Math.random() * FASHION_SEARCH_QUERIES.length)];
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query: `fashion ${randomQuery} full body`,
        per_page: 30,
        order_by: 'latest',
        client_id: process.env.UNSPLASH_ACCESS_KEY
      },
      timeout: 8000
    });
    return response.data.results
      .map((photo: any) => ({
        id: photo.id,
        source: 'unsplash',
        image_url: photo.urls.regular,
        thumb_url: photo.urls.thumb,
        title: (photo.alt_description || photo.description || randomQuery).split(/[.!?\n]/)[0].substring(0, 50).replace(/https?:\/\/\S+/g, '').trim() || 'Fashion Trend',
        likes: photo.likes,
        downloads: photo.downloads || 0,
        trend_score: photo.likes * 10,
        photographer: photo.user.name,
        photographer_url: photo.user.links.html,
        date: photo.created_at,
        description: photo.description,
        alt_description: photo.alt_description
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
    const randomQuery = FASHION_SEARCH_QUERIES[Math.floor(Math.random() * FASHION_SEARCH_QUERIES.length)];
    const response = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params: {
        query: `fashion ${randomQuery}`,
        per_page: 30,
        orientation: 'portrait'
      },
      timeout: 8000
    });
    return response.data.photos
      .map((photo: any) => ({
        id: photo.id,
        source: 'pexels',
        image_url: photo.src.large,
        thumb_url: photo.src.medium,
        title: `${randomQuery.charAt(0).toUpperCase() + randomQuery.slice(1)} by ${photo.photographer}`,
        likes: 0,
        downloads: 0,
        trend_score: 500,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        date: new Date().toISOString(),
        description: photo.alt || ''
      }))
      .filter(isValidFashionImage);
  } catch (e) {
    console.error("Pexels error:", e);
    return [];
  }
}

async function fetchPixabayFashion() {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || key === 'YOUR_PIXABAY_API_KEY' || key.length < 5) {
    console.log("Pixabay API key missing or invalid placeholder, skipping...");
    return [];
  }
  try {
    const randomQuery = FASHION_SEARCH_QUERIES[Math.floor(Math.random() * FASHION_SEARCH_QUERIES.length)].replace(/ /g, '+');
    const response = await axios.get("https://pixabay.com/api/", {
      params: {
        key: key,
        q: `fashion+${randomQuery}`,
        image_type: 'photo',
        per_page: 30,
        order: 'latest'
      },
      timeout: 5000 // Add timeout to prevent hanging
    });
    
    if (!response.data || !response.data.hits) {
      return [];
    }

    return response.data.hits
      .map((photo: any) => ({
        id: photo.id,
        source: 'pixabay',
        image_url: photo.largeImageURL,
        thumb_url: photo.previewURL,
        title: (photo.tags || 'Fashion').split(',')[0],
        likes: photo.likes,
        downloads: photo.downloads,
        trend_score: photo.likes * 5 + photo.downloads,
        photographer: photo.user,
        photographer_url: `https://pixabay.com/users/${photo.user}-${photo.user_id}/`,
        date: new Date().toISOString(),
        description: photo.tags || ''
      }))
      .filter(isValidFashionImage);
  } catch (e: any) {
    // Silently handle 400 errors which usually mean invalid key
    if (e.response && e.response.status === 400) {
      console.warn("Pixabay API returned 400 (likely invalid key). Skipping Pixabay results.");
    } else {
      console.error("Pixabay error:", e.message || e);
    }
    return [];
  }
}

async function getTrendingFast() {
  // If no keys are provided, use high-quality mock data to ensure the UI is populated
  const hasKeys = process.env.UNSPLASH_ACCESS_KEY || process.env.PEXELS_API_KEY || process.env.PIXABAY_API_KEY;
  
  const mockTrends = [
    {
      id: 'mock-1',
      source: 'mirrorfit',
      image_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=200&q=80',
      title: 'Vibrant Floral Summer Dress',
      likes: 1240,
      downloads: 450,
      trend_score: 950,
      photographer: 'Fashion Curator',
      date: new Date().toISOString()
    },
    {
      id: 'mock-2',
      source: 'mirrorfit',
      image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80',
      title: 'Elegant Yellow Evening Gown',
      likes: 890,
      downloads: 210,
      trend_score: 820,
      photographer: 'Style Bot',
      date: new Date().toISOString()
    },
    {
      id: 'mock-3',
      source: 'mirrorfit',
      image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=200&q=80',
      title: 'Classic White Lace Dress',
      likes: 2100,
      downloads: 800,
      trend_score: 980,
      photographer: 'Trend Hunter',
      date: new Date().toISOString()
    },
    {
      id: 'mock-4',
      source: 'mirrorfit',
      image_url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=200&q=80',
      title: 'Modern Silk Slip Dress',
      likes: 1500,
      downloads: 300,
      trend_score: 880,
      photographer: 'Office Style',
      date: new Date().toISOString()
    },
    {
      id: 'mock-5',
      source: 'mirrorfit',
      image_url: 'https://images.unsplash.com/photo-1475180098004-ca77a650455c?auto=format&fit=crop&w=800&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1475180098004-ca77a650455c?auto=format&fit=crop&w=200&q=80',
      title: 'Bohemian Ruffle Maxi Dress',
      likes: 3200,
      downloads: 1200,
      trend_score: 995,
      photographer: 'Luxury Trends',
      date: new Date().toISOString()
    }
  ];

  if (!hasKeys) {
    console.log("No fashion API keys found, using mock data...");
    return mockTrends;
  }

  const results = await Promise.all([
    fetchUnsplashTrending(),
    fetchPexelsFashion(),
    fetchPixabayFashion()
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
    const count = uniqueItems.filter(i => `${i.source}-${i.photographer}` === photographerKey).length;
    if (count < 2) {
      uniqueItems.push(item);
    }
    if (uniqueItems.length >= 50) break;
  }

  uniqueItems.sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0));

  const now = new Date().toISOString();
  return uniqueItems.map(item => ({ ...item, fetched_at: now }));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Virtual Trial APIs (Ported from Python structure)
  app.post('/api/virtual-trial/upload', async (req, res) => {
    try {
      const { user_image, cloth_image } = req.body;
      if (!user_image || !cloth_image) {
        return res.status(400).json({ error: 'Both user_image and cloth_image are required' });
      }

      const job_id = Math.random().toString(36).substring(2, 15);
      virtualTrialJobs[job_id] = {
        id: job_id,
        status: 'uploaded',
        user_image,
        cloth_image,
        created_at: new Date().toISOString()
      };

      res.json({
        job_id,
        message: 'Images uploaded successfully',
        status: 'uploaded'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/virtual-trial/process/:job_id', async (req, res) => {
    const { job_id } = req.params;
    const job = virtualTrialJobs[job_id];

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'processing' || job.status === 'completed') {
      return res.json({ job_id, status: job.status, message: 'Job already in progress or completed' });
    }

    job.status = 'processing';

    // Trigger async processing (we'll do it "sync" for simplicity in this environment but return immediately if needed)
    // Actually, we'll just process it now and update the job object.
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("Gemini API Key is not configured on the server. Please select an API key in the AI Studio dialog.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const userBase64 = job.user_image.split(',')[1] || job.user_image;
      const clothBase64 = job.cloth_image.split(',')[1] || job.cloth_image;

      const prompt = `VIRTUAL TRY-ON TASK:
1. Take the person from the first image.
2. Take the garment from the second image.
3. Precisely apply the garment onto the person's body.
4. Maintain the person's pose, face, and the background exactly.
5. The garment should look naturally worn, with realistic folds and shadows.
6. Output ONLY the resulting image of the person wearing the garment.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
          parts: [
            { inlineData: { data: userBase64, mimeType: "image/png" } },
            { inlineData: { data: clothBase64, mimeType: "image/png" } },
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let resultUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          resultUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (resultUrl) {
        job.status = 'completed';
        job.result_url = resultUrl;
        job.completed_at = new Date().toISOString();
        res.json({ job_id, status: 'completed', message: 'Processing completed' });
      } else {
        throw new Error("AI failed to generate image");
      }
    } catch (e: any) {
      job.status = 'failed';
      job.error = e.message;
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/virtual-trial/status/:job_id', (req, res) => {
    const { job_id } = req.params;
    const job = virtualTrialJobs[job_id];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      job_id,
      status: job.status,
      created_at: job.created_at,
      completed_at: job.completed_at,
      error: job.error
    });
  });

  app.get('/api/virtual-trial/result/:job_id', (req, res) => {
    const { job_id } = req.params;
    const job = virtualTrialJobs[job_id];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'completed') return res.status(400).json({ error: 'Job not completed' });
    
    // Return the base64 image as a response
    const base64Data = job.result_url.split(',')[1];
    const img = Buffer.from(base64Data, 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  });

  app.post('/api/virtual-trial/preview', async (req, res) => {
    try {
      const { user_image, cloth_image } = req.body;
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });

      const userBase64 = user_image.split(',')[1] || user_image;
      const clothBase64 = cloth_image.split(',')[1] || cloth_image;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
          parts: [
            { inlineData: { data: userBase64, mimeType: "image/png" } },
            { inlineData: { data: clothBase64, mimeType: "image/png" } },
            { text: "Quick virtual try-on preview. Put the garment on the person." }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let previewUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          previewUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      res.json({ preview: previewUrl, message: 'Preview generated' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/virtual-trial/history', (req, res) => {
    const history = Object.values(virtualTrialJobs).map(job => ({
      job_id: job.id,
      status: job.status,
      created_at: job.created_at,
      completed_at: job.completed_at,
      has_result: !!job.result_url
    }));
    res.json({ history });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Routes
  app.get('/api/trending/fast', async (req, res) => {
    try {
      const now = Date.now();
      if (trendingCache && (now - cacheTimestamp < CACHE_DURATION)) {
        return res.json({
          ...trendingCache,
          cached: true
        });
      }

      const trendingItems = await getTrendingFast();
      const responseData = {
        last_updated: new Date().toISOString(),
        trending_items: trendingItems,
        cached: false,
        count: trendingItems.length
      };

      trendingCache = responseData;
      cacheTimestamp = now;

      res.json(responseData);
    } catch (e: any) {
      res.status(500).json({ error: e.message, cached: false });
    }
  });

  app.get('/api/hairstyles', async (req, res) => {
    try {
      const { gender = 'female', category = 'Trendy' } = req.query;
      const styles = await fetchHairstylesFromAPIs(gender as string, category as string);
      
      // If no results from APIs, fallback to some high-quality defaults
      if (styles.length === 0) {
        const defaults = [
          {
            id: 'def-1',
            name: 'Classic Elegance',
            category: category as string,
            gender: gender as string,
            imageUrl: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=800&q=80',
            description: 'A timeless look that never goes out of style.'
          },
          {
            id: 'def-2',
            name: 'Modern Chic',
            category: category as string,
            gender: gender as string,
            imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
            description: 'Perfect for the modern fashion-forward individual.'
          }
        ];
        return res.json({ hairstyles: defaults, count: defaults.length, source: 'fallback' });
      }

      res.json({
        hairstyles: styles,
        count: styles.length,
        source: 'api'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/trending/refresh', async (req, res) => {
    try {
      trendingCache = null;
      const trendingItems = await getTrendingFast();
      const responseData = {
        last_updated: new Date().toISOString(),
        trending_items: trendingItems,
        cached: false,
        count: trendingItems.length
      };
      trendingCache = responseData;
      cacheTimestamp = Date.now();
      res.json({ message: 'Trending data refreshed', count: trendingItems.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tryon', async (req, res) => {
    try {
      const { person_image, garment_image } = req.body;

      if (!replicate) {
        throw new Error("REPLICATE_API_TOKEN is not configured.");
      }

      console.log("Starting Replicate Try-On...");
      
      const output = await replicate.run(
        "cuuupid/idm-vton:c871bb9b0ad21223066831fbc97ce2e3939423272d033a6df6538a02b38cb084",
        {
          input: {
            crop: false,
            seed: 42,
            steps: 30,
            category: "upper_body",
            force_dc: false,
            human_img: person_image,
            garm_img: garment_image,
            garment_des: "fashion garment"
          }
        }
      );

      console.log("Replicate Try-On Complete:", output);
      res.json({ result: output });
    } catch (e: any) {
      console.error("Replicate Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // API 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
