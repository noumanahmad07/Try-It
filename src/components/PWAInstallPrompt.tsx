import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, X, Download } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export default function PWAInstallPrompt() {
  const { isInstallable, installPWA } = usePWA();
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isInstallable || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-4 left-4 right-4 z-[100] max-w-[358px] mx-auto"
      >
        <div className="bg-[#1a1a1f] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-[14px] font-semibold">Install TryOn AI</h4>
            <p className="text-[12px] text-[#a1a1aa]">Add to home screen for better experience</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => installPWA()}
              className="px-3 py-1.5 bg-white text-black text-[12px] font-semibold rounded-lg"
            >
              Install
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#a1a1aa]" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
