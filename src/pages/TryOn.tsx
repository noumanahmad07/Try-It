import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Sparkles, ChevronLeft, AlertCircle, Check, Mic, QrCode, Info, Ruler, Palette, Zap, Shield, UserPlus, Download, Heart } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import ReactCompareImage from 'react-compare-image';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { Type } from "@google/genai";
import { QRCodeSVG } from 'qrcode.react';
import { vibrate, cn, useVoiceCommand, withRetry } from '../lib/utils';
import { BodyAnalysis } from '../types';
import { getGeminiAI, getGeminiKey, isGeminiConfigured } from "../utils/geminiConfig";
import { buildTryOnPrompt } from "../utils/tryOnPrompt";
import GlassCard from '../components/GlassCard';

interface TryOnProps {
  onBack: () => void;
  initialGarment?: string | null;
}

export default function TryOn({ onBack, initialGarment }: TryOnProps) {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(initialGarment || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(2); // 2: Processing, 3: Result
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const initialized = useRef(false);
  const [showClothModal, setShowClothModal] = useState(false);
  const [modalGarmentPhoto, setModalGarmentPhoto] = useState<string | null>(null);
  const [modalGarmentFileName, setModalGarmentFileName] = useState<string | null>(null);
  const [modalGarmentClothingHint, setModalGarmentClothingHint] = useState<string | null>(null);
  const [modalSuggestions, setModalSuggestions] = useState<any[]>([]);
  const [modalIsFetchingSuggestions, setModalIsFetchingSuggestions] = useState(false);
  const [modalSuggestionsError, setModalSuggestionsError] = useState<string | null>(null);
  const [modalIsUploading, setModalIsUploading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  const checkApiKey = async () => {
    // If we have a key in the environment or our hardcoded fallback, we're good
    if (getGeminiKey()) return true;

    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setNeedsApiKey(!hasKey);
      return hasKey;
    }
    return true;
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
      // After opening, we assume success and try again
      startTryOn();
    }
  };

  const resultRef = useRef<HTMLDivElement>(null);

  const saveToMyLooks = () => {
    if (!result) return;
    vibrate();
    setIsSaving(true);
    
    const saved = localStorage.getItem("my_looks");
    const looks = saved ? JSON.parse(saved) : [];
    
    const newLook = {
      id: Date.now().toString(),
      image: result,
      date: new Date().toISOString(),
      type: 'clothes',
      garment: garmentImage
    };
    
    localStorage.setItem("my_looks", JSON.stringify([newLook, ...looks]));
    
    setTimeout(() => {
      setIsSaving(false);
      confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
    }, 500);
  };

  const { startListening } = useVoiceCommand((command) => {
    setIsListening(false);
    if (command.includes('red')) {
      vibrate();
      // In a real app, we'd trigger a re-generation with a color filter or prompt change
      alert("Voice command received: Changing to red look...");
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'person' | 'garment') => {
    const file = e.target.files?.[0];
    if (!file) return;
    vibrate();
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'person') setPersonImage(base64);
        else setGarmentImage(base64);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setError("Failed to compress image.");
    }
  };

  const openClothModal = () => {
    vibrate();
    setModalError(null);
    setModalGarmentPhoto(null);
    setModalGarmentFileName(null);
    setModalGarmentClothingHint(null);
    setModalSuggestions([]);
    setModalSuggestionsError(null);
    if (modalFileInputRef.current) modalFileInputRef.current.value = "";
    setShowClothModal(true);

    setModalIsFetchingSuggestions(true);
    void withRetry(async () => {
      const res = await fetch("/api/trending/fast?page=1&limit=6");
      if (!res.ok) throw new Error("Failed to load suggestions");
      return res.json();
    })
      .then((data) => {
        setModalSuggestions(Array.isArray(data?.trending_items) ? data.trending_items : []);
      })
      .catch((e: any) => {
        setModalSuggestionsError(e?.message || "Failed to load suggestions");
      })
      .finally(() => {
        setModalIsFetchingSuggestions(false);
      });
  };

  const handleModalUploadClick = () => {
    modalFileInputRef.current?.click();
  };

  const selectSuggestedGarment = (item: any) => {
    const imageUrl = item?.image_url || item?.imageUrl || null;
    if (!imageUrl) return;
    const fileName = imageUrl.split("/").pop()?.split("?")[0] || null;
    setModalGarmentPhoto(imageUrl);
    setModalGarmentFileName(fileName);
    setModalGarmentClothingHint(item?.title || item?.name || null);
    setModalError(null);
  };

  const closeClothModal = () => setShowClothModal(false);

  const handleModalGarmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalError(null);
    setModalIsUploading(true);
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setModalGarmentPhoto(dataUrl);
        setModalGarmentFileName(file.name || null);
        setModalGarmentClothingHint(file.name || null);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setModalError("Failed to compress garment image.");
    } finally {
      setModalIsUploading(false);
    }
  };

  const handleModalTryAgain = () => {
    vibrate();
    setModalError(null);
    setModalGarmentPhoto(null);
    setModalGarmentFileName(null);
    setModalGarmentClothingHint(null);
    if (modalFileInputRef.current) modalFileInputRef.current.value = "";
  };

  const handleModalGenerate = async () => {
    if (!personImage) {
      setModalError("Person image is missing. Please try again.");
      return;
    }
    if (!modalGarmentPhoto) {
      setModalError("Upload a garment image first.");
      return;
    }

    // Ensure prompt "smart logic" can read the garment filename.
    sessionStorage.setItem("garmentPhoto", modalGarmentPhoto);
    sessionStorage.setItem("garmentFileName", modalGarmentFileName || "");
    sessionStorage.setItem("garmentClothingHint", modalGarmentClothingHint || "");
    if (customPrompt) sessionStorage.setItem("customPrompt", customPrompt);

    setGarmentImage(modalGarmentPhoto);
    setModalError(null);
    setShowClothModal(false);

    await startTryOn(personImage, modalGarmentPhoto, true);
  };

  const startTryOn = async (
    overridePerson?: string,
    overrideGarment?: string,
    forceGenerate: boolean = false,
  ) => {
    if (isProcessing) return;
    const pImg = overridePerson || personImage;
    const gImg = overrideGarment || garmentImage;

    if (!pImg || !gImg) {
      console.error("Missing images for try-on", { pImg, gImg });
      return;
    }

    vibrate();
    setIsProcessing(true);
    setStep(2);
    setError(null);
    setNeedsApiKey(false);

    try {
      const storedGarmentFileName = sessionStorage.getItem("garmentFileName");
      const storedPrompt = sessionStorage.getItem("customPrompt");
      const storedClothingHint = sessionStorage.getItem("garmentClothingHint");
      let analysisSnapshot = analysis;
      const storedAnalysis = sessionStorage.getItem("bodyAnalysis");
      if (storedAnalysis) {
        try {
          analysisSnapshot = JSON.parse(storedAnalysis) as BodyAnalysis;
        } catch {
          // Ignore parse errors and fall back to current state.
        }
      }
      const prompt = buildTryOnPrompt({
        garmentFileName: storedGarmentFileName,
        customPrompt: storedPrompt,
        analysis: analysisSnapshot,
        fullBodyClothingHint: storedClothingHint || undefined,
      });

      // 1. Upload Images
      console.log("Uploading images for virtual trial...");
      const uploadRes = await fetch('/api/virtual-trial/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_image: pImg,
          cloth_image: gImg,
          prompt,
          force_generate: forceGenerate,
        })
      });

      if (!uploadRes.ok) throw new Error("Failed to upload images");
      const { job_id } = await uploadRes.json();

      // 2. Start Processing
      console.log(`Starting processing for job: ${job_id}`);
      const processRes = await fetch(`/api/virtual-trial/process/${job_id}`, {
        method: 'POST'
      });

      if (!processRes.ok) {
        const errData = await processRes.json().catch(() => ({}));
        const msg = errData.error || "Failed to start processing";
        throw new Error(msg);
      }

      // 3. Poll for Status
      let status = 'processing';
      let attempts = 0;
      const maxAttempts = 90; // allow slower AI generation

      while (status === 'processing' && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusRes = await fetch(`/api/virtual-trial/status/${job_id}`);
        const statusData = await statusRes.json();
        status = statusData.status;

        if (status === 'failed') {
          throw new Error(statusData.error || "Processing failed");
        }
      }

      if (status !== 'completed') {
        throw new Error("Processing timed out. Please try again.");
      }

      // 4. Get Result
      const resultRes = await fetch(`/api/virtual-trial/result/${job_id}`);
      if (!resultRes.ok) throw new Error("Failed to fetch result image");
      
      const blob = await resultRes.blob();
      const generatedImage = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      if (!generatedImage) throw new Error("AI failed to generate result. Please try again with clearer photos.");

      setResult(generatedImage);
      setStep(3);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error("Try-on error:", err);
      setError(err.message || "AI processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefine = async () => {
    if (!result || !refinePrompt) return;
    vibrate();
    setIsRefining(true);
    setError(null);

    try {
      if (!isGeminiConfigured()) {
        setError("Refine with AI is unavailable (Gemini not configured).");
        return;
      }

      const ai = getGeminiAI();
      const base64Data = result.split(',')[1];

      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/png" } },
            { text: `Edit this image based on the following instruction: ${refinePrompt}. Maintain the person and the garment, only apply the requested change. Return only the edited image.` }
          ]
        }
      }));

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResult(`data:image/png;base64,${part.inlineData.data}`);
          setRefinePrompt("");
          break;
        }
      }
    } catch (err: any) {
      console.error("Refinement error:", err);
      setError("AI Refinement failed: " + (err.message || "Unknown error"));
    } finally {
      setIsRefining(false);
    }
  };

  // Load from sessionStorage if available (from UploadScreen)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const storedPerson = sessionStorage.getItem("bodyPhoto");
      const storedGarment = sessionStorage.getItem("garmentPhoto");
      const storedAnalysis = sessionStorage.getItem("bodyAnalysis");
      const storedPrompt = sessionStorage.getItem("customPrompt");
      
      console.log("TryOn initialization check:", { 
        hasPerson: !!storedPerson, 
        hasGarment: !!storedGarment 
      });

      if (storedPerson && storedGarment) {
        setPersonImage(storedPerson);
        setGarmentImage(storedGarment);
        setCustomPrompt(storedPrompt);
        let analysisData = null;
        if (storedAnalysis) {
          try {
            analysisData = JSON.parse(storedAnalysis);
            setAnalysis(analysisData);
          } catch (e) {
            console.error("Failed to parse analysis data", e);
          }
        }
        
        // Start processing immediately
        startTryOn(storedPerson, storedGarment);
      } else {
        // If we don't have images in storage, check if we have them in state
        if (!personImage && !garmentImage) {
          console.warn("No images found for try-on, redirecting to upload...");
          onBack();
        }
      }
    } catch (err) {
      console.error("Error in TryOn initialization:", err);
      setError("Failed to initialize try-on. Please try again.");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-10 glass-dark">
        <button onClick={onBack} className="p-2 -ml-2"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="font-display font-bold text-xl">
          {step === 1 ? "Upload" : step === 2 ? "Analyzing..." : "Result"}
        </h2>
        <button 
          onClick={() => { vibrate(); setIsListening(true); startListening(); }}
          className={cn("p-2 rounded-full transition-all", isListening ? "bg-error animate-pulse" : "bg-white/10")}
        >
          <Mic className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 2 && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[60vh] text-center">
              {needsApiKey ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 max-w-md p-8 glass-dark rounded-[2.5rem] border border-brand-indigo/20"
                >
                  <div className="w-20 h-20 rounded-full bg-brand-indigo/10 flex items-center justify-center mx-auto mb-2">
                    <Shield className="w-10 h-10 text-brand-indigo" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">AI Quota Exceeded</h3>
                    <p className="text-[#a1a1aa] text-sm leading-relaxed">
                      The API key being used has reached its limit. To continue, please select a different Gemini API key or wait for the quota to reset.
                    </p>
                    <div className="bg-brand-indigo/10 border border-brand-indigo/20 p-3 rounded-xl text-[11px] text-brand-indigo mt-4 text-left">
                      <strong>Note:</strong> Even personal keys have limits. If you just added a key, it might be on the "Free" tier which has lower limits.
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      onClick={handleOpenKeyDialog} 
                      className="w-full h-[52px] rounded-full font-semibold bg-brand-indigo text-white hover:bg-brand-indigo/90 transition-colors"
                    >
                      Select API Key
                    </button>
                    <button 
                      onClick={onBack} 
                      className="w-full h-[52px] rounded-full font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 max-w-md p-8 glass-dark rounded-[2.5rem] border border-error/20"
                >
                  <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-10 h-10 text-error" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">Generation Failed</h3>
                    <p className="text-[#a1a1aa] text-sm leading-relaxed">{error}</p>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      onClick={() => startTryOn(undefined, undefined, true)} 
                      className="w-full h-[52px] rounded-full font-semibold bg-white text-black hover:bg-white/90 transition-colors"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={onBack} 
                      className="w-full h-[52px] rounded-full font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      Change Photos
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="relative w-48 h-48 mb-12">
                    <motion.div animate={{ scale: [1, 1.1, 1], rotate: 360 }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 border-4 border-brand-indigo/30 rounded-full animate-pulse-glow" />
                    <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-12 h-12 text-brand-indigo" /></div>
                    <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity }} className="absolute left-0 right-0 h-1 bg-brand-indigo shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                  </div>
                  <div className="space-y-4"><h3 className="text-2xl font-bold font-display">AI Analysis...</h3><ProcessingText /></div>
                </>
              )}
            </motion.div>
          )}

          {step === 3 && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
              <h2 className="text-3xl font-bold font-display text-center">See The Magic</h2>
              
              <div className="space-y-4">
                <div key={result} ref={resultRef} className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-bg-secondary result-glow">
                  <ReactCompareImage 
                    leftImage={personImage!} 
                    rightImage={result} 
                    sliderLineColor="#EC4899"
                    handle={<div className="w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-white"><div className="w-1 h-4 bg-gray-400 rounded-full mx-0.5" /><div className="w-1 h-4 bg-gray-400 rounded-full mx-0.5" /></div>}
                  />
                </div>
                <p className="text-center text-text-muted text-sm">Drag to compare • Real AI results</p>
              </div>

              {/* AI Refinement Input */}
              <div className="glass-dark p-6 rounded-[2.5rem] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-brand-indigo">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-lg font-bold font-display">Refine with AI</span>
                </div>
                <p className="text-xs text-[#a1a1aa]">Describe any changes, like "Add a retro filter" or "Make the background a modern loft".</p>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Describe your edit..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm focus:outline-none focus:border-brand-indigo transition-colors"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                  />
                  <button 
                    onClick={handleRefine}
                    disabled={isRefining || !refinePrompt}
                    className="w-12 h-12 rounded-full bg-brand-indigo flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    {isRefining ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap className="w-5 h-5 text-white" />}
                  </button>
                </div>
                {error && <p className="text-error text-[11px] px-2 font-medium">{error}</p>}
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Zap className="w-8 h-8 text-brand-pink" />, title: "Instant Results", desc: "Under 10 seconds" },
                  { icon: <Shield className="w-8 h-8 text-brand-pink" />, title: "100% Private", desc: "No data saved" },
                  { icon: <UserPlus className="w-8 h-8 text-brand-pink" />, title: "No Sign Up", desc: "Start right away" },
                  { icon: <Download className="w-8 h-8 text-brand-pink" />, title: "Save & Share", desc: "Download anytime" }
                ].map((feature, i) => (
                  <div key={i} className="bg-bg-secondary p-6 rounded-[2rem] border border-white/[0.05] flex flex-col items-center text-center space-y-3 shadow-lg shadow-black/20">
                    <div className="mb-2">{feature.icon}</div>
                    <h4 className="font-bold text-lg leading-tight">{feature.title}</h4>
                    <p className="text-text-muted text-xs">{feature.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={saveToMyLooks} 
                  disabled={isSaving}
                  className="btn-secondary flex items-center justify-center space-x-2 py-4"
                >
                  {isSaving ? <Check className="w-5 h-5 text-green-500" /> : <Heart className="w-5 h-5 text-[#ec4899]" />}
                  <span>{isSaving ? "Saved!" : "Save Look"}</span>
                </button>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Check my new look generated by Zephora!")}`)} className="btn-primary flex items-center justify-center space-x-2 py-4"><Check className="w-5 h-5" /><span>WhatsApp</span></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowQR(true)} className="btn-secondary flex items-center justify-center space-x-2 py-4 bg-white/5 border-white/10"><QrCode className="w-5 h-5" /><span>QR Share</span></button>
                <button 
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = result;
                    link.download = "tryon-result.png";
                    link.click();
                  }} 
                  className="btn-secondary flex items-center justify-center space-x-2 py-4 bg-white/5 border-white/10"
                >
                  <Download className="w-5 h-5" />
                  <span>Download</span>
                </button>
              </div>

              <button onClick={openClothModal} className="w-full py-4 text-text-muted font-medium hover:text-white transition-colors">Try Another</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6">
            <div className="glass p-8 rounded-3xl text-center space-y-6 max-w-xs w-full">
              <h3 className="text-xl font-bold">Scan to View</h3>
              <div className="bg-white p-4 rounded-2xl inline-block"><QRCodeSVG value={window.location.href} size={200} /></div>
              <button onClick={() => setShowQR(false)} className="btn-primary w-full">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cloth Change Modal */}
      <AnimatePresence>
        {showClothModal && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-6"
          >
            <div className="glass p-8 rounded-3xl text-center space-y-6 max-w-[390px] w-full overflow-hidden">
              <input
                ref={modalFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleModalGarmentUpload}
              />
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Change Clothes</h3>
                <button
                  onClick={closeClothModal}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[12px] text-[#a1a1aa]">
                  Upload a garment photo, then Generate a new try-on using your current photo.
                </p>
              </div>

              <div className="space-y-4">
                <GlassCard className="p-4 bg-white/5 border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-[12px] font-semibold text-white">Suggested Clothes</p>
                    {modalIsFetchingSuggestions && (
                      <p className="text-[12px] text-[#a1a1aa]">Loading...</p>
                    )}
                  </div>

                  {modalSuggestionsError && (
                    <p className="text-error text-[12px] mb-3">{modalSuggestionsError}</p>
                  )}

                  {modalIsFetchingSuggestions ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-20 rounded-xl bg-white/5 border border-white/10"
                        />
                      ))}
                    </div>
                  ) : modalSuggestions.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {modalSuggestions.slice(0, 6).map((item, i) => (
                        <button
                          key={item?.id || i}
                          onClick={() => selectSuggestedGarment(item)}
                          className={`rounded-xl overflow-hidden border transition-colors ${
                            modalGarmentPhoto === (item?.image_url || item?.imageUrl)
                              ? "border-[#ec4899]"
                              : "border-white/10"
                          }`}
                          disabled={modalIsUploading || isProcessing}
                          aria-label="Select suggested garment"
                        >
                          <img
                            src={item?.image_url || item?.imageUrl}
                            alt={item?.title || item?.name || "Suggested garment"}
                            className="w-full h-20 object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#a1a1aa]">
                      No suggestions available right now.
                    </p>
                  )}
                </GlassCard>

                <GlassCard className="relative overflow-hidden">
                  {!modalGarmentPhoto ? (
                    <div
                      className="flex flex-col items-center justify-center py-10 px-6 cursor-pointer"
                      onClick={handleModalUploadClick}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-semibold">Upload Garment</h4>
                      <p className="text-[12px] text-[#a1a1aa] mt-1">
                        Product photo (best results with clear images)
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={modalGarmentPhoto}
                        alt="Selected garment"
                        className="w-full h-[220px] object-cover"
                      />
                      <button
                        onClick={handleModalTryAgain}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  )}
                </GlassCard>

                {modalError && (
                  <p className="text-error text-[12px] font-medium">{modalError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleModalUploadClick}
                  className="btn-secondary bg-white/5 border-white/10"
                  disabled={modalIsUploading || isProcessing}
                >
                  Upload
                </button>

                <button
                  onClick={handleModalGenerate}
                  disabled={modalIsUploading || isProcessing || !modalGarmentPhoto}
                  className="btn-primary disabled:opacity-50 disabled:saturate-0 disabled:cursor-not-allowed"
                >
                  {modalIsUploading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating
                    </span>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>

              <button
                onClick={handleModalTryAgain}
                className="btn-secondary bg-white/5 border-white/10 w-full"
              >
                Try Again
              </button>

              <button onClick={closeClothModal} className="w-full text-text-muted font-medium hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProcessingText() {
  const [index, setIndex] = useState(0);
  const texts = [
    "Generating AI try-on...",
    "Detecting body type...",
    "Analyzing skin tone...",
    "Matching fabric...",
    "Rendering result...",
  ];
  useEffect(() => {
    const timer = setInterval(() => setIndex(i => (i + 1) % texts.length), 2500);
    return () => clearInterval(timer);
  }, []);
  return <motion.p key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-text-muted">{texts[index]}</motion.p>;
}
