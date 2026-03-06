import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Camera, Upload, Sparkles, Download, Save, Trash2, Palette, Maximize, Scissors, Wand2, Info, CheckCircle, X, Shirt, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as fabric from 'fabric';
import { FaceMesh } from '@mediapipe/face_mesh';
import * as cam from '@mediapipe/camera_utils';
import GlassCard from '../components/GlassCard';
import { GoogleGenAI } from '@google/genai';
import { vibrate, withRetry } from '../lib/utils';

// Hairstyle Data
const HAIRSTYLES = {
  girls: [
    { id: 'g-long-1', name: 'Straight Long', category: 'Long', url: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=80' },
    { id: 'g-long-2', name: 'Wavy Long', category: 'Long', url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&q=80' },
    { id: 'g-short-1', name: 'Bob Cut', category: 'Short', url: 'https://images.unsplash.com/photo-1584297141812-0199b7d33f2e?auto=format&fit=crop&w=400&q=80' },
    { id: 'g-short-2', name: 'Pixie Cut', category: 'Short', url: 'https://images.unsplash.com/photo-1592188072370-65821f691780?auto=format&fit=crop&w=400&q=80' },
    { id: 'g-trendy-1', name: 'Wolf Cut', category: 'Trendy', url: 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&w=400&q=80' },
  ],
  boys: [
    { id: 'b-classic-1', name: 'Side Part', category: 'Classic', url: 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?auto=format&fit=crop&w=400&q=80' },
    { id: 'b-modern-1', name: 'Fade Cut', category: 'Modern', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80' },
    { id: 'b-modern-2', name: 'Undercut', category: 'Modern', url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=400&q=80' },
    { id: 'b-trendy-1', name: 'Korean Cut', category: 'Trendy', url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=400&q=80' },
  ]
};

const ACCESSORIES = [
  { id: 'acc-1', name: 'Aviator Glasses', category: 'Glasses', url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=400&q=80' },
  { id: 'acc-2', name: 'Round Glasses', category: 'Glasses', url: 'https://images.unsplash.com/photo-1511499767390-90342f16b407?auto=format&fit=crop&w=400&q=80' },
  { id: 'acc-3', name: 'Baseball Cap', category: 'Hats', url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80' },
  { id: 'acc-4', name: 'Beanie', category: 'Hats', url: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=400&q=80' },
];

const HAIR_COLORS = [
  { name: 'Black', color: '#000000' },
  { name: 'Brown', color: '#4a2c2a' },
  { name: 'Blonde', color: '#d4af37' },
  { name: 'Ash Grey', color: '#b2beb5' },
  { name: 'Red', color: '#8b0000' },
  { name: 'Blue', color: '#00008b' },
  { name: 'Silver', color: '#c0c0c0' },
];

export default function HairstyleTryOn() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clothes' | 'hairstyle' | 'accessories'>('hairstyle');
  const [gender, setGender] = useState<'girls' | 'boys'>('girls');
  const [category, setCategory] = useState('All');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceShape, setFaceShape] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [selectedHair, setSelectedHair] = useState<string | null>(null);
  const [hairColor, setHairColor] = useState('#000000');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (canvasContainerRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas('hair-canvas', {
        width: 350,
        height: 450,
        backgroundColor: '#1a1a1a',
      });
      fabricCanvasRef.current = canvas;

      canvas.on('object:moving', () => vibrate());
      canvas.on('object:scaling', () => vibrate());
    }

    return () => {
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Initialize Face Mesh
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        handleFaceDetection(results.multiFaceLandmarks[0]);
      }
    });

    faceMeshRef.current = faceMesh;
  }, []);

  const handleFaceDetection = async (landmarks: any) => {
    // Basic face shape analysis logic
    // In a real app, we'd use the landmarks to calculate ratios
    // For now, we'll use Gemini to analyze the image if available
    if (!faceShape && userImage) {
      analyzeFaceShape(userImage);
    }

    // Auto-positioning logic would go here
    // We can use landmarks[10] (top of forehead) and landmarks[152] (chin)
  };

  const analyzeFaceShape = async (imageData: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Analyze this person's face shape (Oval, Round, Square, Heart, or Diamond) and recommend 3 best hairstyles for them. Return as JSON: { shape: string, recommendations: string[] }" },
              { inlineData: { data: imageData.split(',')[1], mimeType: 'image/jpeg' } }
            ]
          }
        ],
        config: { responseMimeType: 'application/json' }
      });

      const result = JSON.parse(response.text || '{}');
      setFaceShape(result.shape);
      setRecommendations(result.recommendations);
    } catch (e) {
      console.error("Face analysis failed:", e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUserImage(dataUrl);
        setBackgroundImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const setBackgroundImage = (url: string) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      // Scale image to fit canvas
      const scale = Math.min(canvas.width! / img.width!, canvas.height! / img.height!);
      img.set({
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = img;
      canvas.renderAll();
    });
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const camera = new cam.Camera(videoRef.current, {
          onFrame: async () => {
            if (faceMeshRef.current && videoRef.current) {
              await faceMeshRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setUserImage(dataUrl);
      setBackgroundImage(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCameraActive(false);
  };

  const applyOverlay = (url: string, type: 'hair' | 'accessory') => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    vibrate();

    // Remove existing of same type
    const existing = canvas.getObjects().find(obj => (obj as any).overlayType === type);
    if (existing) canvas.remove(existing);

    fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      img.set({
        left: canvas.width! / 2,
        top: type === 'hair' ? canvas.height! / 3 : canvas.height! / 2,
        originX: 'center',
        originY: 'center',
        scaleX: 0.5,
        scaleY: 0.5,
        cornerColor: '#ec4899',
        cornerSize: 10,
        transparentCorners: false,
        borderColor: '#ec4899',
      });
      (img as any).overlayType = type;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      if (type === 'hair') setSelectedHair(url);
    });
  };

  const changeHairColor = (color: string) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const hair = canvas.getObjects().find(obj => (obj as any).overlayType === 'hair') as fabric.Image;
    
    if (hair) {
      setHairColor(color);
      // Simple tinting using filters
      // In a real app, we'd use more complex blending
      hair.filters = [new fabric.filters.BlendColor({
        color: color,
        mode: 'tint',
        alpha: 0.5
      })];
      hair.applyFilters();
      canvas.renderAll();
    }
  };

  const saveLook = () => {
    if (!fabricCanvasRef.current) return;
    const dataUrl = fabricCanvasRef.current.toDataURL({ format: 'png' });
    const savedLooks = JSON.parse(localStorage.getItem('my_looks') || '[]');
    savedLooks.push({
      id: Date.now().toString(),
      image: dataUrl,
      type: 'hairstyle',
      date: new Date().toISOString()
    });
    localStorage.setItem('my_looks', JSON.stringify(savedLooks));
    vibrate();
    alert("Look saved to 'My Looks'!");
  };

  const downloadResult = () => {
    if (!fabricCanvasRef.current) return;
    const dataUrl = fabricCanvasRef.current.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `hairstyle-tryon-${Date.now()}.png`;
    link.click();
  };

  const categories = activeTab === 'accessories' 
    ? ['All', 'Glasses', 'Hats']
    : ['All', 'Long', 'Short', 'Trendy', 'Classic', 'Modern'];
    
  const filteredStyles = activeTab === 'accessories'
    ? ACCESSORIES.filter(item => category === 'All' || item.category === category)
    : HAIRSTYLES[gender].filter(style => category === 'All' || style.category === category);

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <div className="max-w-[390px] mx-auto relative pb-24">
        
        {/* Header */}
        <div className="px-6 pt-12 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Virtual Try-On</h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 mb-8">
          <div className="flex bg-[#1a1a1f] p-1.5 rounded-full border border-white/5 shadow-2xl">
            <button 
              onClick={() => navigate('/upload')}
              className="flex-1 py-3 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-2 text-[#a1a1aa] hover:text-white"
            >
              <Shirt className="w-4 h-4" />
              Clothes
            </button>
            <button 
              onClick={() => setActiveTab('hairstyle')}
              className="flex-1 py-3 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#ec4899] to-[#f97316] text-white shadow-lg"
            >
              <Scissors className="w-4 h-4" />
              Hairstyle
            </button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="px-6 mb-8">
          {!userImage && !isCameraActive ? (
            <div className="space-y-6">
              <GlassCard className="relative overflow-hidden aspect-[3/4] flex flex-col items-center justify-center bg-[#1a1a1f] border border-white/5 shadow-2xl p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center mb-8 shadow-2xl shadow-[#ec4899]/30">
                  <ImageIcon className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold mb-3">Try Different Hairstyles</h2>
                <p className="text-[#a1a1aa] text-sm leading-relaxed mb-10 px-4">
                  Upload your photo and see how different hairstyles and colors look on you
                </p>

                <motion.button 
                  onClick={() => navigate('/hairstyle-selection')}
                  className="w-full h-14 rounded-full bg-gradient-to-r from-[#ec4899] to-[#f97316] text-white font-bold text-lg shadow-lg shadow-[#ec4899]/40 flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.97 }}
                >
                  Choose Hairstyle
                </motion.button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </GlassCard>

              {/* Bottom Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-[#1a1a1f] border border-white/5 hover:bg-white/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-[#ec4899]" />
                  </div>
                  <span className="text-sm font-bold text-[#a1a1aa] group-hover:text-white transition-colors">Live Camera</span>
                </button>
                
                <button 
                  onClick={() => navigate('/my-looks')}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-[#1a1a1f] border border-white/5 hover:bg-white/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6 text-[#ec4899]" />
                  </div>
                  <span className="text-sm font-bold text-[#a1a1aa] group-hover:text-white transition-colors">My Looks</span>
                </button>
              </div>
            </div>
          ) : (
            <GlassCard className="relative overflow-hidden aspect-[3/4] flex items-center justify-center bg-black/40 border-2 border-dashed border-white/10">
              {isCameraActive && (
                <div className="absolute inset-0 z-20 bg-black">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                    <button 
                      onClick={stopCamera}
                      className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={capturePhoto}
                      className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-4 border-[#ec4899]"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#ec4899]" />
                    </button>
                  </div>
                </div>
              )}

              <div 
                ref={canvasContainerRef} 
                className={`w-full h-full ${!userImage ? 'hidden' : 'block'}`}
              >
                <canvas id="hair-canvas" />
              </div>

              {/* AI Recommendations Overlay */}
              {userImage && !faceShape && (
                <button 
                  onClick={() => analyzeFaceShape(userImage)}
                  className="absolute top-4 right-4 z-30 bg-[#ec4899] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-3 h-3" />
                  Analyze Face
                </button>
              )}
              
              {faceShape && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute top-4 right-4 z-30"
                >
                  <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-xs max-w-[150px]">
                    <div className="flex items-center justify-between gap-2 text-[#ec4899] font-bold mb-2">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Face: {faceShape}
                      </div>
                      <button onClick={() => setFaceShape(null)} className="text-[#a1a1aa] hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="flex items-center gap-1 text-[#a1a1aa]">
                          <CheckCircle className="w-2 h-2 text-[#22c55e]" />
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          )}
        </div>

        {/* Controls Area */}
        {userImage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 space-y-8"
          >
            {/* Gender & Categories */}
            <div className="space-y-4">
              {activeTab === 'hairstyle' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setGender('girls')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${gender === 'girls' ? 'bg-[#ec4899]/10 border-[#ec4899] text-[#ec4899]' : 'bg-white/5 border-white/10 text-[#a1a1aa]'}`}
                  >
                    For Girls
                  </button>
                  <button 
                    onClick={() => setGender('boys')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${gender === 'boys' ? 'bg-[#ec4899]/10 border-[#ec4899] text-[#ec4899]' : 'bg-white/5 border-white/10 text-[#a1a1aa]'}`}
                  >
                    For Boys
                  </button>
                </div>
              )}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${category === cat ? 'bg-white text-black' : 'bg-white/5 text-[#a1a1aa] border border-white/10'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Hairstyle Gallery */}
            <div className="grid grid-cols-3 gap-3">
              {filteredStyles.map(style => (
                <button 
                  key={style.id}
                  onClick={() => applyOverlay(style.url, activeTab === 'accessories' ? 'accessory' : 'hair')}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedHair === style.url ? 'border-[#ec4899] scale-95' : 'border-white/10'}`}
                >
                  <img src={style.url} className="w-full h-full object-cover" alt={style.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <span className="text-[10px] font-bold truncate">{style.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Color Changer */}
            {activeTab === 'hairstyle' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#ec4899]" />
                  Hair Color
                </h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {HAIR_COLORS.map(c => (
                    <button 
                      key={c.name}
                      onClick={() => changeHairColor(c.color)}
                      className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all ${hairColor === c.color ? 'border-white scale-110' : 'border-white/10'}`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={saveLook}
                className="h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 font-bold hover:bg-white/10 transition-all"
              >
                <Save className="w-5 h-5" />
                Save Look
              </button>
              <button 
                onClick={downloadResult}
                className="h-14 rounded-2xl bg-[#ec4899] flex items-center justify-center gap-2 font-bold shadow-lg shadow-[#ec4899]/20"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            </div>

            {/* Reset Button */}
            <button 
              onClick={() => {
                setUserImage(null);
                setSelectedHair(null);
                setFaceShape(null);
                fabricCanvasRef.current?.clear();
              }}
              className="w-full py-4 text-sm text-red-400 font-bold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Reset All
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
