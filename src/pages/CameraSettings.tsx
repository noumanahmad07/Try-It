import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Camera,
  Settings,
  Save,
  Check,
  Zap,
  Image,
} from "lucide-react";
import GlassCard from "../components/GlassCard";
import { useSettings } from "../contexts/SettingsContext";

export default function CameraSettings() {
  const navigate = useNavigate();
  const { settings, updateCameraSettings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleToggle = (key: string) => {
    updateCameraSettings({
      [key]: !settings.camera[key as keyof typeof settings.camera],
    });
  };

  const handleQualityChange = (quality: string) => {
    updateCameraSettings({
      photoQuality: quality as "low" | "medium" | "high",
    });
  };

  const handleFlashModeChange = (mode: string) => {
    updateCameraSettings({ flashMode: mode as "auto" | "on" | "off" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error("Camera settings update error:", error);
      alert("Failed to update camera settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const qualityLevels = [
    {
      id: "low",
      name: "Low",
      description: "Faster loading, smaller files",
      size: "~500KB",
    },
    {
      id: "medium",
      name: "Medium",
      description: "Balanced quality and size",
      size: "~1MB",
    },
    {
      id: "high",
      name: "High",
      description: "Best quality, larger files",
      size: "~2MB",
    },
  ];

  const flashModes = [
    { id: "auto", name: "Auto", description: "Automatic flash detection" },
    { id: "on", name: "On", description: "Always use flash" },
    { id: "off", name: "Off", description: "Never use flash" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="max-w-[390px] mx-auto px-6 py-4">
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link to="/settings">
            <motion.button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="text-xl font-semibold">Camera Settings</h1>
        </motion.div>
      </div>

      {/* Success Message */}
      <motion.div
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isSuccess ? 1 : 0, y: isSuccess ? 0 : -20 }}
        transition={{ duration: 0.3 }}
      >
        <GlassCard className="px-4 py-3 flex items-center gap-3 bg-green-500/20 border-green-500/50">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-medium">
            Camera settings updated!
          </span>
        </GlassCard>
      </motion.div>

      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {/* Photo Quality */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-400" />
            Photo Quality
          </h3>
          <div className="space-y-3">
            {qualityLevels.map((level) => (
              <motion.button
                key={level.id}
                className={`w-full p-3 rounded-lg border transition-all ${
                  settings.camera.photoQuality === level.id
                    ? "bg-purple-500/20 border-purple-500"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
                onClick={() => handleQualityChange(level.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-medium">{level.name}</p>
                    <p className="text-xs text-gray-400">{level.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{level.size}</p>
                    {settings.camera.photoQuality === level.id && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1 ml-auto" />
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Capture Settings */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            Capture Settings
          </h3>
          <div className="space-y-4">
            {/* Auto Capture */}
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("autoCapture")}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium">Auto Capture</p>
                  <p className="text-xs text-gray-400">
                    Automatically capture photos
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.camera.autoCapture ? "bg-yellow-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    settings.camera.autoCapture
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>

            {/* Grid Lines */}
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("gridLines")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-0.5">
                    <div className="w-1 h-1 bg-white" />
                    <div className="w-1 h-1 bg-white" />
                    <div className="w-1 h-1 bg-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Grid Lines</p>
                  <p className="text-xs text-gray-400">Show composition grid</p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.camera.gridLines ? "bg-purple-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    settings.camera.gridLines
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>
          </div>
        </GlassCard>

        {/* Flash Settings */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Flash Mode</h3>
          <div className="grid grid-cols-3 gap-3">
            {flashModes.map((mode) => (
              <motion.button
                key={mode.id}
                className={`p-3 rounded-lg border transition-all ${
                  settings.camera.flashMode === mode.id
                    ? "bg-orange-500/20 border-orange-500"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
                onClick={() => handleFlashModeChange(mode.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-center">
                  <div
                    className={`w-8 h-8 rounded-full mx-auto mb-2 ${
                      mode.id === "on"
                        ? "bg-orange-500"
                        : mode.id === "off"
                          ? "bg-gray-500"
                          : "bg-gradient-to-r from-orange-500 to-gray-500"
                    }`}
                  />
                  <p className="text-xs font-medium">{mode.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {mode.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Device Feedback */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Device Feedback</h3>
          <div className="space-y-4">
            {/* Sound */}
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("soundEnabled")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-lg">🔊</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Sound Effects</p>
                  <p className="text-xs text-gray-400">Camera shutter sounds</p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.camera.soundEnabled ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    settings.camera.soundEnabled
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>

            {/* Haptic Feedback */}
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("hapticFeedback")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-lg">📳</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Haptic Feedback</p>
                  <p className="text-xs text-gray-400">Vibration on capture</p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  settings.camera.hapticFeedback
                    ? "bg-purple-500"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    settings.camera.hapticFeedback
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>
          </div>
        </GlassCard>

        {/* Save Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
