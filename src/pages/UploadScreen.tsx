import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Upload, X, Check, Info, Camera, Image as ImageIcon, Sparkles, Zap, AlertCircle, Shirt, Scissors } from "lucide-react";
import GlassCard from "../components/GlassCard";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "../utils/haptics";
import { compressImage, blobToDataURL } from "../utils/imageCompression";
import { Type } from "@google/genai";
import { withRetry, cn } from "../lib/utils";
import { getGeminiAI } from "../utils/geminiConfig";

export default function UploadScreen() {
  const navigate = useNavigate();
  const [bodyPhoto, setBodyPhoto] = useState<string | null>(null);
  const [garmentPhoto, setGarmentPhoto] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [tipsType, setTipsType] = useState<"body" | "garment">("body");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  // Load pre-selected garment if available
  useEffect(() => {
    const storedGarment = sessionStorage.getItem("garmentPhoto");
    if (storedGarment) {
      setGarmentPhoto(storedGarment);
    }
  }, []);

  const analyzeBody = async (imageData: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysis(null);
      setAnalysisError(null);
      
      const ai = getGeminiAI();
      const base64Data = imageData.split(',')[1];

      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
          { text: "Analyze this person's body type and skin tone for fashion recommendations. Return JSON: bodyType, skinTone, suggestedSize, colorPalette (3 hex colors)." }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bodyType: { type: Type.STRING },
              skinTone: { type: Type.STRING },
              suggestedSize: { type: Type.STRING },
              colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["bodyType", "skinTone", "suggestedSize", "colorPalette"]
          }
        }
      }));

      const data = JSON.parse(response.text || '{}');
      setAnalysis(data);
      triggerHaptic('success');
    } catch (error: any) {
      console.error("Analysis failed:", error);
      if (error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED' || error.message?.includes('429')) {
        setAnalysisError("AI Quota exceeded. You can still proceed, but results might be less accurate.");
      } else {
        setAnalysisError("AI Analysis failed. You can still proceed manually.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "body" | "garment"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const compressedBlob = await compressImage(file, {
          maxWidth: 800,
          maxHeight: 1000,
          quality: 0.7,
        });
        
        const dataURL = await blobToDataURL(compressedBlob);
        
        if (type === "body") {
          setBodyPhoto(dataURL);
          analyzeBody(dataURL);
        } else {
          setGarmentPhoto(dataURL);
        }
        
        triggerHaptic('success');
      } catch (error) {
        console.error("Error processing image:", error);
        triggerHaptic('error');
        alert("Failed to process image.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleContinue = () => {
    if (bodyPhoto && garmentPhoto) {
      try {
        triggerHaptic('medium');
        sessionStorage.setItem("bodyPhoto", bodyPhoto);
        sessionStorage.setItem("garmentPhoto", garmentPhoto);
        if (analysis) {
          sessionStorage.setItem("bodyAnalysis", JSON.stringify(analysis));
        }
        if (customPrompt) {
          sessionStorage.setItem("customPrompt", customPrompt);
        }
        navigate("/processing");
      } catch (error) {
        console.error("Session storage error:", error);
        alert("The photos are too large to process. Please try smaller images or a different browser.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <div className="max-w-[390px] mx-auto relative pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0f0f13]/80 border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/">
              <motion.button 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
            <h1 className="font-semibold">Upload Photos</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 mb-8">
          <div className="flex bg-[#1a1a1f] p-1.5 rounded-full border border-white/5 shadow-2xl">
            <button 
              className="flex-1 py-3 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#ec4899] to-[#f97316] text-white shadow-lg"
            >
              <Shirt className="w-4 h-4" />
              Clothes
            </button>
            <button 
              onClick={() => navigate('/hairstyle')}
              className="flex-1 py-3 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-2 text-[#a1a1aa] hover:text-white"
            >
              <Scissors className="w-4 h-4" />
              Hairstyle
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#ec4899] to-[#f97316]"
                initial={{ width: "0%" }}
                animate={{ width: bodyPhoto && garmentPhoto ? "100%" : bodyPhoto || garmentPhoto ? "50%" : "0%" }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[13px] text-[#a1a1aa]">
              {bodyPhoto && garmentPhoto ? "2/2" : bodyPhoto || garmentPhoto ? "1/2" : "0/2"}
            </span>
          </div>
        </div>

        <div className="px-6 space-y-6">
          {/* Upload Full Body Photo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Your Full Body Photo</h2>
              <button 
                className="text-[#ec4899] text-[13px] flex items-center gap-1"
                onClick={() => {
                  setTipsType("body");
                  setShowTips(true);
                }}
              >
                <Info className="w-4 h-4" />
                Tips
              </button>
            </div>

            {!bodyPhoto ? (
              <GlassCard className="relative">
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "body")}
                  />
                  <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold mb-2">Upload Your Photo</h3>
                    <p className="text-[13px] text-[#a1a1aa] text-center mb-4">
                      Stand against a plain wall with good lighting
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
                      <Check className="w-3 h-3 text-[#22c55e]" />
                      Min. 500x500px recommended
                    </div>
                  </div>
                </label>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                <GlassCard className="relative overflow-hidden">
                  <img 
                    src={bodyPhoto} 
                    alt="Body" 
                    className="w-full h-[300px] object-cover"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <motion.button 
                      className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setBodyPhoto(null);
                        setAnalysis(null);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <label className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-[13px] cursor-pointer border border-white/20 flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Replace Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "body")}
                      />
                    </label>
                  </div>
                </GlassCard>

                {/* AI Analysis Feedback */}
                <AnimatePresence>
                  {(isAnalyzing || analysis || analysisError) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <GlassCard className={cn("p-4 bg-white/5 border-white/10", analysisError ? "border-error/20" : "")}>
                        {isAnalyzing ? (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#ec4899] border-t-transparent rounded-full animate-spin" />
                            <p className="text-[13px] text-[#a1a1aa]">AI is analyzing your body type...</p>
                          </div>
                        ) : analysisError ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center">
                              <AlertCircle className="w-4 h-4 text-error" />
                            </div>
                            <p className="text-[12px] text-error/80">{analysisError}</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-[#22c55e]" />
                              </div>
                              <div>
                                <p className="text-[11px] text-[#a1a1aa] uppercase tracking-wider font-bold">AI Analysis Complete</p>
                                <p className="text-[14px] font-semibold">{analysis.bodyType} • {analysis.skinTone}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {analysis.colorPalette.map((color: string, i: number) => (
                                <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Upload Garment Photo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Garment Image</h2>
              <button 
                className="text-[#ec4899] text-[13px] flex items-center gap-1"
                onClick={() => {
                  setTipsType("garment");
                  setShowTips(true);
                }}
              >
                <Info className="w-4 h-4" />
                Tips
              </button>
            </div>

            {!garmentPhoto ? (
              <GlassCard className="relative">
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "garment")}
                  />
                  <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold mb-2">Upload Garment</h3>
                    <p className="text-[13px] text-[#a1a1aa] text-center mb-4">
                      Product image from any online store
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
                      <Check className="w-3 h-3 text-[#22c55e]" />
                      Clear product images work best
                    </div>
                  </div>
                </label>
              </GlassCard>
            ) : (
              <GlassCard className="relative overflow-hidden">
                <img 
                  src={garmentPhoto} 
                  alt="Garment" 
                  className="w-full h-[300px] object-cover"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <motion.button 
                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setGarmentPhoto(null)}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="absolute bottom-3 left-3">
                  <label className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-[13px] cursor-pointer border border-white/20 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Replace Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "garment")}
                    />
                  </label>
                </div>
              </GlassCard>
            )}
          </motion.div>

          {/* Custom Style Prompt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#ec4899]" />
              <h2 className="font-semibold">Custom Style (Optional)</h2>
            </div>
            <GlassCard className="p-4 bg-white/5 border-white/10">
              <textarea
                placeholder="e.g. 'Add a retro filter', 'Make it look like I'm in Paris', 'Change background to a modern loft'"
                className="w-full bg-transparent border-none outline-none text-[14px] text-white placeholder:text-[#a1a1aa] resize-none h-20"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </GlassCard>
          </motion.div>

          {/* Quick Access to Camera & My Looks */}
          <div className="grid grid-cols-2 gap-4">
            <Link to="/camera">
              <GlassCard className="p-4 text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-[#ec4899]" />
                <p className="text-[13px]">Live Camera</p>
              </GlassCard>
            </Link>
            <Link to="/my-looks">
              <GlassCard className="p-4 text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-[#ec4899]" />
                <p className="text-[13px]">My Looks</p>
              </GlassCard>
            </Link>
          </div>
        </div>

        {/* Continue Button (Fixed at bottom) */}
        <AnimatePresence>
          {bodyPhoto && garmentPhoto && (
            <motion.div 
              className="fixed bottom-0 left-0 right-0 p-6 backdrop-blur-xl bg-[#0f0f13]/90 border-t border-white/10"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <div className="max-w-[390px] mx-auto">
                <motion.button
                  className="w-full h-[52px] rounded-full font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
                    boxShadow: "0 0 40px rgba(236, 72, 153, 0.5)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleContinue}
                >
                  Generate Try-On
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips Modal */}
        <AnimatePresence>
          {showTips && (
            <motion.div
              className="fixed inset-0 z-50 flex items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowTips(false)}
              />
              <motion.div
                className="relative w-full max-w-[390px] mx-auto bg-[#1a1a1f] rounded-t-3xl p-6"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
              >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                
                <h2 className="text-[22px] font-semibold mb-4">
                  {tipsType === "body" ? "Photo Tips" : "Garment Tips"}
                </h2>

                {tipsType === "body" ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Stand against a plain wall</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Ensure good lighting (natural light works best)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Full body should be visible</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Wear fitted clothing (avoid baggy clothes)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Stand straight with arms slightly away from body</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Use clear product images from online stores</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Garment should be on a model or mannequin</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">Avoid heavily edited or filtered images</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <p className="text-[#a1a1aa]">High resolution images work best</p>
                    </div>
                  </div>
                )}

                <button
                  className="w-full h-[52px] mt-6 rounded-full bg-gradient-to-r from-[#ec4899] to-[#f97316] font-semibold"
                  onClick={() => setShowTips(false)}
                >
                  Got It
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
