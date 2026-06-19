import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Sparkles, X } from "lucide-react";

interface LoginRequiredModalProps {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
}

export default function LoginRequiredModal({
  open,
  onClose,
  returnTo = "/upload",
}: LoginRequiredModalProps) {
  const navigate = useNavigate();

  const goToLogin = () => {
    onClose();
    navigate("/login", { state: { from: returnTo } });
  };

  const goToSignup = () => {
    onClose();
    navigate("/signup", { state: { from: returnTo } });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-[390px] bg-[#1a1a1f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ec4899] to-[#f97316]" />

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#a1a1aa] hover:text-white hover:bg-white/15 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-8 pb-6 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#ec4899]/20 to-[#f97316]/20 border border-[#ec4899]/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ec4899] to-[#f97316] flex items-center justify-center shadow-lg shadow-[#ec4899]/30">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              </div>

              <h2 className="text-[22px] font-semibold mb-2">
                Sign in to continue
              </h2>
              <p className="text-[14px] text-[#a1a1aa] leading-relaxed mb-6 px-2">
                You&apos;ve used your free try-on. Create an account or sign in
                to generate unlimited looks.
              </p>

              <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 w-fit mx-auto">
                <Sparkles className="w-4 h-4 text-[#ec4899]" />
                <span className="text-[12px] text-[#a1a1aa]">
                  1 free try-on used
                </span>
              </div>

              <div className="space-y-3">
                <motion.button
                  type="button"
                  className="w-full h-[52px] rounded-full font-semibold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
                    boxShadow: "0 0 32px rgba(236, 72, 153, 0.35)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goToLogin}
                >
                  Sign In
                </motion.button>

                <motion.button
                  type="button"
                  className="w-full h-[52px] rounded-full font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-colors"
                  whileTap={{ scale: 0.97 }}
                  onClick={goToSignup}
                >
                  Create Account
                </motion.button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 text-[13px] text-[#a1a1aa] hover:text-white transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
