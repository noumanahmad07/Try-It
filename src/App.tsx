import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import Home from './pages/Home';
import TryOn from './pages/TryOn';
import CameraMode from './pages/Camera';
import FastTrendingPage from './pages/FastTrendingPage';
import UploadScreen from './pages/UploadScreen';
import MyLooks from './pages/MyLooks';
import AIFashionDesigner from './pages/AIFashionDesigner';
import HairstyleTryOn from './pages/HairstyleTryOn';
import HairstyleSelection from './pages/HairstyleSelection';
import HairstyleResult from './pages/HairstyleResult';
import FashionAssistant from './components/FashionAssistant';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [initialGarment, setInitialGarment] = useState<string | null>(null);

  return (
    <div className="min-h-screen relative bg-black text-white selection:bg-indigo-500/30 overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<UploadScreen />} />
            <Route path="/processing" element={<TryOn onBack={() => navigate('/upload')} />} />
            <Route path="/my-looks" element={<MyLooks />} />
            <Route path="/camera" element={<CameraMode onBack={() => navigate('/')} />} />
            <Route path="/ai-designer" element={<AIFashionDesigner />} />
            <Route path="/hairstyle" element={<HairstyleTryOn />} />
            <Route path="/hairstyle-selection" element={<HairstyleSelection />} />
            <Route path="/hairstyle-result" element={<HairstyleResult />} />
            <Route path="/trending" element={
              <FastTrendingPage 
                onBack={() => navigate('/')} 
                onTryOn={(url) => {
                  sessionStorage.setItem("garmentPhoto", url);
                  navigate('/upload');
                }}
              />
            } />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <FashionAssistant />
    </div>
  );
}
