import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowLeft, Trash2, Download, Share2, Heart } from "lucide-react";
import GlassCard from "../components/GlassCard";
import { motion, AnimatePresence } from "motion/react";
import { vibrate } from "../lib/utils";

interface SavedLook {
  id: string;
  image: string;
  date: string;
  type?: 'clothes' | 'hairstyle';
  garment?: string;
}

export default function MyLooks() {
  const [looks, setLooks] = useState<SavedLook[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("my_looks");
    if (saved) {
      setLooks(JSON.parse(saved));
    }
  }, []);

  const deleteLook = (id: string) => {
    vibrate();
    const updated = looks.filter(l => l.id !== id);
    setLooks(updated);
    localStorage.setItem("my_looks", JSON.stringify(updated));
  };

  const downloadImage = (url: string, id: string) => {
    vibrate();
    const link = document.createElement("a");
    link.href = url;
    link.download = `look-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h1 className="font-semibold">My Looks</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="px-6 py-8">
          {looks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <Heart className="w-10 h-10 text-white/20" />
              </div>
              <h2 className="text-xl font-semibold">No looks saved yet</h2>
              <p className="text-[#a1a1aa] text-sm px-10">
                Generate a try-on and save it to see it here!
              </p>
              <Link to="/upload">
                <button className="btn-primary px-8 mt-4">Start Creating</button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence>
                {looks.map((look) => (
                  <motion.div
                    key={look.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <GlassCard className="overflow-hidden">
                      <div className="relative aspect-[3/4]">
                        <img 
                          src={look.image} 
                          alt="Saved Look" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                          <button 
                            onClick={() => deleteLook(look.id)}
                            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-red-400"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => downloadImage(look.image, look.id)}
                            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium">
                            {look.type === 'hairstyle' ? 'Hairstyle Try-On' : 'Clothes Try-On'}
                          </p>
                          <p className="text-[11px] text-[#a1a1aa]">
                            {new Date(look.date).toLocaleDateString()}
                          </p>
                        </div>
                        <button className="p-2 bg-white/5 rounded-lg">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
