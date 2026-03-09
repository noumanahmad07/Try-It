import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Lock,
  Download,
  Shield,
  Zap,
  Camera,
  TrendingUp,
  Wand2,
  Scissors,
  RefreshCw,
} from "lucide-react";
import GlassCard from "../components/GlassCard";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import { motion } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { withRetry, vibrate } from "../lib/utils";
import ReactCompareImage from "react-compare-image";

export default function Home() {
  const navigate = useNavigate();
  const [demoImages, setDemoImages] = useState<{
    before: string;
    after: string;
  }>({
    before: "/src/assets/images/LeftSide.png",
    after: "/src/assets/images/RightSide.avif",
  });
  const [isLoadingSlider, setIsLoadingSlider] = useState(false);
  const [trendingItems, setTrendingItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await withRetry(async () => {
          const res = await fetch("/api/trending/fast");
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return await res.json();
        });
        setTrendingItems(data.trending_items.slice(0, 6));
      } catch (e) {
        console.error("Failed to fetch trending:", e);
      }
    };

    fetchTrending();
    const interval = setInterval(fetchTrending, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const handleTryOn = (imageUrl: string) => {
    vibrate();
    // Store garment in session and navigate
    sessionStorage.setItem("garmentPhoto", imageUrl);
    navigate("/upload");
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white overflow-x-hidden">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Container - Max width 390px */}
      <div className="max-w-[390px] mx-auto relative">
        {/* Hero Section */}
        <motion.div
          className="px-6 pt-12 pb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo/Brand */}
          <motion.div
            className="flex items-center gap-2 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold">TryOn AI</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-[28px] font-bold leading-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Found a dress you like?
            <br />
            <span className="text-[#ec4899]">See how it looks on you</span>{" "}
            instantly.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="text-[#a1a1aa] mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            No downloads. No account required. Try in seconds.
          </motion.p>

          {/* Primary CTA */}
          <Link to="/upload">
            <motion.button
              className="w-full h-[52px] rounded-full font-semibold relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
                boxShadow:
                  "0 0 40px rgba(236, 72, 153, 0.5), 0 8px 16px rgba(0, 0, 0, 0.3)",
              }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" />
                Start Virtual Try-On
              </span>
              <motion.div
                className="absolute inset-0 bg-white/20"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "linear",
                }}
              />
            </motion.button>
          </Link>

          {/* Trust Badge */}
          <motion.div
            className="flex items-center justify-center gap-2 mt-6 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 w-fit mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Lock className="w-4 h-4 text-[#22c55e]" />
            <span className="text-[13px] text-[#a1a1aa]">
              Privacy First – Your photos are never stored
            </span>
          </motion.div>
        </motion.div>

        {/* How It Works Section */}
        <motion.div
          className="px-6 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-[22px] font-semibold mb-8 text-center">
            How It Works
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <GlassCard className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Upload your photo</h3>
                  <p className="text-[13px] text-[#a1a1aa]">
                    Full body photo with good lighting
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Step 2 */}
            <GlassCard className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Upload garment</h3>
                  <p className="text-[13px] text-[#a1a1aa]">
                    Product image from any store
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Step 3 */}
            <GlassCard className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">See instant result</h3>
                  <p className="text-[13px] text-[#a1a1aa]">
                    AI generates your try-on in seconds
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.div>

        {/* AI Designer & Hairstyle Section */}
        <motion.div
          className="px-6 py-8 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="grid grid-cols-1 gap-4">
            <Link to="/ai-designer">
              <GlassCard className="p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wand2 className="w-24 h-24 rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#ec4899]/20 text-[#ec4899] text-[10px] font-bold uppercase tracking-wider">
                      New
                    </span>
                    <h3 className="font-bold text-lg">AI Fashion Designer</h3>
                  </div>
                  <p className="text-[13px] text-[#a1a1aa] mb-4">
                    Design custom garments with Nano Banana Pro. High-resolution
                    4K output available.
                  </p>
                  <div className="flex items-center gap-2 text-[#ec4899] font-semibold text-sm">
                    Start Designing <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </GlassCard>
            </Link>

            <Link to="/hairstyle">
              <GlassCard className="p-6 relative overflow-hidden group border-[#ec4899]/30">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Scissors className="w-24 h-24 -rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#ec4899]/20 text-[#ec4899] text-[10px] font-bold uppercase tracking-wider">
                      Hot
                    </span>
                    <h3 className="font-bold text-lg">Hairstyle Try-On</h3>
                  </div>
                  <p className="text-[13px] text-[#a1a1aa] mb-4">
                    Will short hair suit you? Try 50+ styles and colors
                    instantly.
                  </p>
                  <div className="flex items-center gap-2 text-[#ec4899] font-semibold text-sm">
                    Try Hairstyles <Scissors className="w-4 h-4" />
                  </div>
                </div>
              </GlassCard>
            </Link>
          </div>
        </motion.div>

        {/* Before/After Demo Slider */}
        <motion.div
          className="px-6 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <h2 className="text-[22px] font-semibold mb-6 text-center">
            See The Magic
          </h2>

          <GlassCard className="overflow-hidden rounded-[2.5rem]">
            <div
              key={`${demoImages.before}-${demoImages.after}`}
              className="relative bg-white/5 min-h-[400px]"
            >
              {isLoadingSlider ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 h-[400px]">
                  <div className="w-12 h-12 border-4 border-[#ec4899] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#a1a1aa] animate-pulse">
                    AI is generating real results...
                  </p>
                </div>
              ) : (
                <ReactCompareImage
                  leftImage={demoImages.before}
                  rightImage={demoImages.after}
                  sliderLineColor="#ec4899"
                  handle={
                    <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-white">
                      <div className="flex gap-1">
                        <div className="w-0.5 h-4 bg-[#0f0f13] rounded-full" />
                        <div className="w-0.5 h-4 bg-[#0f0f13] rounded-full" />
                      </div>
                    </div>
                  }
                />
              )}
            </div>
          </GlassCard>

          <p className="text-center text-[13px] text-[#a1a1aa] mt-4">
            Drag to compare • Real AI results
          </p>
        </motion.div>

        {/* Features Section */}
        <motion.div
          className="px-6 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-4 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-[#ec4899]" />
              <h3 className="font-semibold mb-1 text-[13px]">
                Instant Results
              </h3>
              <p className="text-[11px] text-[#a1a1aa]">Under 10 seconds</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-[#ec4899]" />
              <h3 className="font-semibold mb-1 text-[13px]">100% Private</h3>
              <p className="text-[11px] text-[#a1a1aa]">No data saved</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#ec4899]" />
              <h3 className="font-semibold mb-1 text-[13px]">No Sign Up</h3>
              <p className="text-[11px] text-[#a1a1aa]">Start right away</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <Download className="w-8 h-8 mx-auto mb-2 text-[#ec4899]" />
              <h3 className="font-semibold mb-1 text-[13px]">Save & Share</h3>
              <p className="text-[11px] text-[#a1a1aa]">Download anytime</p>
            </GlassCard>
          </div>
        </motion.div>

        {/* Trending Section */}
        {trendingItems.length > 0 && (
          <motion.div
            className="px-6 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <h2 className="text-[22px] font-semibold flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-[#ec4899]" />
                  Trending Now
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[11px] text-[#a1a1aa] font-medium uppercase tracking-wider">
                    Live Updates
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    vibrate();
                    const fetchTrending = async () => {
                      try {
                        const res = await fetch("/api/trending/fast");
                        const data = await res.json();
                        setTrendingItems(data.trending_items.slice(0, 6));
                      } catch (e) {
                        console.error(e);
                      }
                    };
                    fetchTrending();
                  }}
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-[#ec4899]" />
                </button>
                <Link to="/trending" className="text-[13px] text-[#ec4899]">
                  View All
                </Link>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {trendingItems.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-[160px]">
                  <GlassCard
                    className="overflow-hidden group"
                    onClick={() => handleTryOn(item.image_url)}
                  >
                    <div className="relative aspect-[3/4]">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[12px] font-medium truncate">
                        {item.title}
                      </p>
                      <button className="w-full mt-2 py-1.5 bg-white/10 rounded-lg text-[11px] font-semibold hover:bg-[#ec4899] hover:text-white transition-colors">
                        Try This
                      </button>
                    </div>
                  </GlassCard>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Install App CTA */}
        <motion.div
          className="px-6 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <GlassCard className="p-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-[#ec4899]" />
            <h3 className="font-semibold mb-2">
              Install App for Faster Access
            </h3>
            <p className="text-[13px] text-[#a1a1aa] mb-4">
              Add to your home screen for instant access
            </p>
            <button
              className="w-full h-[44px] rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
              onClick={() => {
                // PWA install logic would go here
                alert("Install prompt would appear here on supported devices");
              }}
            >
              Add to Home Screen
            </button>
          </GlassCard>
        </motion.div>

        {/* Privacy Section */}
        <motion.div
          className="px-6 py-8 pb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Lock className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">Your Privacy Matters</h3>
                <ul className="space-y-2 text-[13px] text-[#a1a1aa]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                    No account required
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                    No ads or tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                    Images deleted after processing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                    All processing happens securely
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Footer */}
        <div className="px-6 py-8 text-center text-[13px] text-[#a1a1aa]">
          <p>© 2026 TryOn AI • Made with 💖 for fashion lovers</p>
        </div>
      </div>
    </div>
  );
}
