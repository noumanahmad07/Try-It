import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { SettingsProvider } from "./contexts/SettingsContext";
import Home from "./pages/Home";
import TryOn from "./pages/TryOn";
import CameraMode from "./pages/Camera";
import FastTrendingPage from "./pages/FastTrendingPage";
import UploadScreen from "./pages/UploadScreen";
import MyLooks from "./pages/MyLooks";
import AIFashionDesigner from "./pages/AIFashionDesigner";
import HairstyleTryOn from "./pages/HairstyleTryOn";
import HairstyleSelection from "./pages/HairstyleSelection";
import HairstyleResult from "./pages/HairstyleResult";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OTPVerification from "./pages/OTPVerification";
import Settings from "./pages/Settings";
import ProfileInformation from "./pages/ProfileInformation";
import EmailPreferences from "./pages/EmailPreferences";
import PrivacySecurity from "./pages/PrivacySecurity";
import Notifications from "./pages/Notifications";
import Appearance from "./pages/Appearance";
import CameraSettings from "./pages/CameraSettings";
import ExportData from "./pages/ExportData";
import HelpCenter from "./pages/HelpCenter";
import FashionAssistant from "./components/FashionAssistant";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [initialGarment, setInitialGarment] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      console.log(
        "Auth state changed:",
        user ? "User logged in" : "User logged out",
      );
    });

    return () => unsubscribe();
  }, []);

  return (
    <SettingsProvider>
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
              {/* Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/otp-verification" element={<OTPVerification />} />

              {/* Settings Routes */}
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/profile-information"
                element={<ProfileInformation />}
              />
              <Route path="/email-preferences" element={<EmailPreferences />} />
              <Route path="/privacy-security" element={<PrivacySecurity />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/appearance" element={<Appearance />} />
              <Route path="/camera-settings" element={<CameraSettings />} />
              <Route path="/export-data" element={<ExportData />} />
              <Route path="/help-center" element={<HelpCenter />} />

              {/* App Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<UploadScreen />} />
              <Route
                path="/processing"
                element={<TryOn onBack={() => navigate("/upload")} />}
              />
              <Route path="/my-looks" element={<MyLooks />} />
              <Route
                path="/camera"
                element={<CameraMode onBack={() => navigate("/")} />}
              />
              <Route path="/ai-designer" element={<AIFashionDesigner />} />
              <Route path="/hairstyle" element={<HairstyleTryOn />} />
              <Route
                path="/hairstyle-selection"
                element={<HairstyleSelection />}
              />
              <Route path="/hairstyle-result" element={<HairstyleResult />} />
              <Route
                path="/trending"
                element={
                  <FastTrendingPage
                    onBack={() => navigate("/")}
                    onTryOn={(url) => {
                      sessionStorage.setItem("garmentPhoto", url);
                      const fileName =
                        url.split("/").pop()?.split("?")[0] || null;
                      sessionStorage.setItem("garmentFileName", fileName || "");
                      navigate("/upload");
                    }}
                  />
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
        {!location.pathname.startsWith("/login") &&
          !location.pathname.startsWith("/signup") &&
          !location.pathname.startsWith("/forgot-password") &&
          !location.pathname.startsWith("/reset-password") &&
          !location.pathname.startsWith("/otp-verification") && (
            <FashionAssistant />
          )}
      </div>
    </SettingsProvider>
  );
}
