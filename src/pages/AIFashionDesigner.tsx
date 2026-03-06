import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, ChevronLeft, Upload, Download, Image as ImageIcon, Wand2, Loader2, RefreshCw, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GlassCard from '../components/GlassCard';
import { GoogleGenAI } from '@google/genai';
import { vibrate, cn } from '../lib/utils';

export default function AIFashionDesigner() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      return hasKey;
    }
    return true;
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
      generateImage();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBaseImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt first.");
      return;
    }

    const hasKey = await checkApiKey();
    if (!hasKey) {
      setNeedsApiKey(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    vibrate();

    try {
      // Create a fresh instance to ensure it uses the latest key from the dialog
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      const contents = {
        parts: [
          { text: prompt }
        ]
      };

      if (baseImage) {
        const base64Data = baseImage.split(',')[1];
        const mimeType = baseImage.split(';')[0].split(':')[1];
        contents.parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        } as any);
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents,
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: imageSize
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          setGeneratedImage(imageUrl);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("No image was generated. Try a different prompt.");
      }
    } catch (err: any) {
      console.error("Image Generation Error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setNeedsApiKey(true);
        setError("API Key error. Please re-select your key.");
      } else {
        setError(err.message || "Failed to generate image. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-fashion-${Date.now()}.png`;
    link.click();
  };

  const useAsGarment = () => {
    if (!generatedImage) return;
    sessionStorage.setItem("garmentPhoto", generatedImage);
    navigate("/upload");
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <div className="max-w-[390px] mx-auto relative px-6 pt-12 pb-24">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#ec4899]" />
            AI Designer
          </h1>
        </div>

        {/* Prompt Input */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a1a1aa]">Describe your fashion idea</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A futuristic neon pink streetwear jacket with holographic details..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#ec4899] transition-colors resize-none"
            />
          </div>

          {/* Image Size Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a1a1aa]">Output Quality</label>
            <div className="grid grid-cols-3 gap-2">
              {(['1K', '2K', '4K'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setImageSize(size)}
                  className={cn(
                    "h-10 rounded-xl text-xs font-semibold border transition-all",
                    imageSize === size 
                      ? "bg-[#ec4899]/10 border-[#ec4899] text-[#ec4899]" 
                      : "bg-white/5 border-white/10 text-[#a1a1aa] hover:bg-white/10"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Base Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a1a1aa]">Base Image (Optional - for editing)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors overflow-hidden"
            >
              {baseImage ? (
                <>
                  <img src={baseImage} className="w-full h-full object-cover" alt="Base" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-[#a1a1aa] mb-2" />
                  <span className="text-xs text-[#a1a1aa]">Click to upload base image</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Generate Button */}
          {needsApiKey ? (
            <div className="p-6 glass-dark rounded-3xl border border-[#ec4899]/20 space-y-4">
              <div className="flex items-center gap-3 text-[#ec4899]">
                <Shield className="w-5 h-5" />
                <span className="font-bold">API Key Required</span>
              </div>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Nano Banana Pro requires a paid Gemini API key. Please select your key to continue.
              </p>
              <button
                onClick={handleOpenKeyDialog}
                className="w-full h-12 rounded-full bg-[#ec4899] font-bold text-sm hover:bg-[#db2777] transition-colors"
              >
                Select API Key
              </button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-center text-[10px] text-[#a1a1aa] underline"
              >
                Learn about Gemini API billing
              </a>
            </div>
          ) : (
            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt.trim()}
              className="w-full h-[52px] rounded-full font-semibold bg-gradient-to-r from-[#ec4899] to-[#f97316] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#ec4899]/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Designing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Design
                </>
              )}
            </button>
          )}

          {error && (
            <p className="text-center text-sm text-red-400 bg-red-400/10 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Result Display */}
          <AnimatePresence>
            {generatedImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-4"
              >
                <h2 className="text-lg font-semibold text-center">Your AI Design</h2>
                <GlassCard className="overflow-hidden rounded-[2.5rem]">
                  <img src={generatedImage} className="w-full aspect-square object-cover" alt="Generated" />
                </GlassCard>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={downloadImage}
                    className="flex items-center justify-center gap-2 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Save
                  </button>
                  <button 
                    onClick={useAsGarment}
                    className="flex items-center justify-center gap-2 h-12 rounded-full bg-[#ec4899] font-semibold hover:bg-[#db2777] transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Try It On
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
