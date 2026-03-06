import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Check, Camera, Sparkles, User, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import GlassCard from "../components/GlassCard";
import { triggerHaptic } from "../utils/haptics";
import { compressImage, blobToDataURL } from "../utils/imageCompression";
import axios from "axios";
import {
  hairstyles as staticHairstyles,
  hairColors,
  getCategoriesByGender,
  type Hairstyle,
} from "../utils/hairstyleData";

export default function HairstyleSelection() {
  const navigate = useNavigate();
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle | null>(null);
  const [selectedColor, setSelectedColor] = useState(hairColors[0]);
  const [gender, setGender] = useState<"female" | "male">("female");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dynamicHairstyles, setDynamicHairstyles] = useState<Hairstyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);

  const categories = getCategoriesByGender(gender);

  const fetchHairstyles = useCallback(async (g: string, c: string) => {
    try {
      setIsLoadingStyles(true);
      const response = await axios.get("/api/hairstyles", {
        params: { gender: g, category: c }
      });
      if (response.data.hairstyles) {
        setDynamicHairstyles(response.data.hairstyles);
      }
    } catch (error) {
      console.error("Failed to fetch hairstyles:", error);
    } finally {
      setIsLoadingStyles(false);
    }
  }, []);

  useEffect(() => {
    // Set first category as default when gender changes
    if (categories.length > 0) {
      const defaultCat = categories[0];
      setSelectedCategory(defaultCat);
      fetchHairstyles(gender, defaultCat);
    }
  }, [gender, fetchHairstyles]);

  useEffect(() => {
    if (selectedCategory) {
      fetchHairstyles(gender, selectedCategory);
    }
  }, [selectedCategory, gender, fetchHairstyles]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBlob = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1600,
          quality: 0.85,
        });
        const dataURL = await blobToDataURL(compressedBlob);
        setFacePhoto(dataURL);
        triggerHaptic("success");
      } catch (error) {
        console.error("Error processing image:", error);
        triggerHaptic("error");
        alert("Failed to process image. Please try another photo.");
      }
    }
  };

  const handleContinue = () => {
    if (facePhoto && selectedHairstyle) {
      triggerHaptic("medium");
      
      // Store in sessionStorage
      sessionStorage.setItem("hairstyle_facePhoto", facePhoto);
      sessionStorage.setItem("hairstyle_selectedStyle", JSON.stringify(selectedHairstyle));
      sessionStorage.setItem("hairstyle_selectedColor", JSON.stringify(selectedColor));
      
      navigate("/hairstyle-result");
    }
  };

  const filteredStaticHairstyles = staticHairstyles.filter(
    (h) =>
      (h.gender === gender || h.gender === "unisex") &&
      (!selectedCategory || selectedCategory === "All" || h.category === selectedCategory)
  );

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <div className="max-w-[390px] mx-auto relative pb-32">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0f0f13]/80 border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/hairstyle">
              <motion.button
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
            <h1 className="font-semibold">Hairstyle Try-On</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#ec4899] to-[#f97316]"
                initial={{ width: "0%" }}
                animate={{
                  width: facePhoto && selectedHairstyle ? "100%" : facePhoto || selectedHairstyle ? "50%" : "0%",
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[13px] text-[#a1a1aa]">
              {facePhoto && selectedHairstyle ? "2/2" : facePhoto || selectedHairstyle ? "1/2" : "0/2"}
            </span>
          </div>
        </div>

        <div className="px-6 space-y-6">
          {/* Upload Face Photo */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-semibold mb-3">Your Face Photo</h2>
            {!facePhoto ? (
              <GlassCard className="relative">
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold mb-2">Upload Your Photo</h3>
                    <p className="text-[13px] text-[#a1a1aa] text-center mb-4">
                      Clear face photo with good lighting
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
                      <Check className="w-3 h-3 text-[#22c55e]" />
                      Face clearly visible
                    </div>
                  </div>
                </label>
              </GlassCard>
            ) : (
              <GlassCard className="relative overflow-hidden">
                <img src={facePhoto} alt="Face" className="w-full h-[280px] object-cover" />
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <label className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-[13px] cursor-pointer border border-white/20 flex items-center justify-center gap-2">
                    <Camera className="w-4 h-4" />
                    Change Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </GlassCard>
            )}
          </motion.div>

          {/* Gender Selector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="font-semibold mb-3">Select Gender</h2>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                className={`h-[52px] rounded-2xl font-semibold flex items-center justify-center gap-2 ${
                  gender === "female"
                    ? "bg-gradient-to-r from-[#ec4899] to-[#f97316]"
                    : "bg-white/5 border border-white/10"
                }`}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setGender("female");
                  triggerHaptic("light");
                }}
              >
                <User className="w-5 h-5" />
                Female
              </motion.button>
              <motion.button
                className={`h-[52px] rounded-2xl font-semibold flex items-center justify-center gap-2 ${
                  gender === "male"
                    ? "bg-gradient-to-r from-[#ec4899] to-[#f97316]"
                    : "bg-white/5 border border-white/10"
                }`}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setGender("male");
                  triggerHaptic("light");
                }}
              >
                <User className="w-5 h-5" />
                Male
              </motion.button>
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-semibold mb-3">Categories</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-[13px] font-medium ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-[#ec4899] to-[#f97316]"
                      : "bg-white/5 border border-white/10"
                  }`}
                  onClick={() => {
                    setSelectedCategory(category);
                    triggerHaptic("light");
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Hairstyle Gallery */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Choose Hairstyle</h2>
              <button 
                onClick={() => selectedCategory && fetchHairstyles(gender, selectedCategory)}
                disabled={isLoadingStyles}
                className={`p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isLoadingStyles ? 'animate-spin opacity-50' : ''}`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {isLoadingStyles && dynamicHairstyles.length === 0 ? (
                // Skeleton loading
                [...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-[4/5] rounded-3xl bg-white/5 animate-pulse" />
                ))
              ) : (
                [...dynamicHairstyles, ...filteredStaticHairstyles].slice(0, 12).map((hairstyle) => (
                  <motion.div
                    key={hairstyle.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSelectedHairstyle(hairstyle);
                      triggerHaptic("medium");
                    }}
                  >
                    <GlassCard
                      className={`relative overflow-hidden cursor-pointer h-full ${
                        selectedHairstyle?.id === hairstyle.id ? "ring-2 ring-[#ec4899]" : ""
                      }`}
                    >
                      <img
                        src={hairstyle.imageUrl}
                        alt={hairstyle.name}
                        className="w-full h-40 object-cover"
                      />
                      {selectedHairstyle?.id === hairstyle.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#ec4899] flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-[13px] mb-1 truncate">{hairstyle.name}</h3>
                        <p className="text-[11px] text-[#a1a1aa] line-clamp-2">{hairstyle.description}</p>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Hair Color Selector */}
          {selectedHairstyle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Hair Color</h2>
                <button
                  className="text-[#ec4899] text-[13px]"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  {showColorPicker ? "Hide" : "Show All"}
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(showColorPicker ? hairColors : hairColors.slice(0, 6)).map((color) => (
                  <motion.button
                    key={color.id}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 ${
                      selectedColor.id === color.id ? "opacity-100" : "opacity-60"
                    }`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedColor(color);
                      triggerHaptic("light");
                    }}
                  >
                    <div
                      className={`w-12 h-12 rounded-full border-2 ${
                        selectedColor.id === color.id ? "border-[#ec4899]" : "border-white/20"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[11px]">{color.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* AI Recommendation */}
          {facePhoto && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">AI Recommendation</h3>
                    <p className="text-[13px] text-[#a1a1aa] mb-2">
                      Based on your face shape (detected as <span className="text-white font-medium">Oval</span>), we
                      recommend:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(dynamicHairstyles.length > 0 ? dynamicHairstyles : filteredStaticHairstyles).slice(0, 3).map((h) => (
                        <span
                          key={h.id}
                          className="px-3 py-1 bg-white/5 rounded-full text-[11px] border border-white/10"
                        >
                          {h.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Continue Button */}
        <AnimatePresence>
          {facePhoto && selectedHairstyle && (
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
                  Try This Hairstyle
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
