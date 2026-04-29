import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Palette,
  Moon,
  Sun,
  Monitor,
  Save,
  Check,
} from "lucide-react";
import GlassCard from "../components/GlassCard";

export default function Appearance() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    theme: "dark",
    fontSize: "medium",
    colorScheme: "purple",
    animations: true,
    highContrast: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleThemeChange = (theme: string) => {
    setPreferences((prev) => ({ ...prev, theme }));
    // Apply theme immediately
    document.documentElement.setAttribute("data-theme", theme);
  };

  const handleToggle = (key: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save to localStorage for demo
      localStorage.setItem(
        "appearancePreferences",
        JSON.stringify(preferences),
      );

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error("Appearance preferences update error:", error);
      alert("Failed to update appearance preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem("appearancePreferences");
    if (saved) {
      const loadedPrefs = JSON.parse(saved);
      setPreferences(loadedPrefs);
      document.documentElement.setAttribute("data-theme", loadedPrefs.theme);
    }
  }, []);

  const themes = [
    { id: "dark", name: "Dark", icon: Moon, color: "bg-gray-900" },
    { id: "light", name: "Light", icon: Sun, color: "bg-gray-100" },
    {
      id: "auto",
      name: "Auto",
      icon: Monitor,
      color: "bg-gradient-to-r from-gray-900 to-gray-100",
    },
  ];

  const colorSchemes = [
    { id: "purple", name: "Purple", color: "bg-purple-500" },
    { id: "blue", name: "Blue", color: "bg-blue-500" },
    { id: "green", name: "Green", color: "bg-green-500" },
    { id: "pink", name: "Pink", color: "bg-pink-500" },
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
          <h1 className="text-xl font-semibold">Appearance</h1>
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
            Appearance preferences updated!
          </span>
        </GlassCard>
      </motion.div>

      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {/* Theme Selection */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            Theme
          </h3>
          <div className="space-y-3">
            {themes.map((theme) => (
              <motion.button
                key={theme.id}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  preferences.theme === theme.id
                    ? "bg-purple-500/20 border-purple-500"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
                onClick={() => handleThemeChange(theme.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme.color}`}
                >
                  <theme.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{theme.name}</p>
                  {preferences.theme === theme.id && (
                    <p className="text-xs text-purple-400">
                      Currently selected
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Color Scheme */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Color Scheme</h3>
          <div className="grid grid-cols-4 gap-3">
            {colorSchemes.map((scheme) => (
              <motion.button
                key={scheme.id}
                className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                  preferences.colorScheme === scheme.id
                    ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                    : "hover:scale-105"
                }`}
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    colorScheme: scheme.id,
                  }))
                }
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-8 h-8 rounded-full ${scheme.color}`} />
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Display Settings */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Font Size
              </label>
              <div className="flex gap-2">
                {["small", "medium", "large"].map((size) => (
                  <motion.button
                    key={size}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all ${
                      preferences.fontSize === size
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                    onClick={() =>
                      setPreferences((prev) => ({ ...prev, fontSize: size }))
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span
                      className={`capitalize ${preferences.fontSize === size ? "font-semibold" : ""}`}
                    >
                      {size}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Animations */}
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("animations")}
            >
              <div>
                <p className="text-sm font-medium">Animations</p>
                <p className="text-xs text-gray-400">
                  Enable interface animations
                </p>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.animations ? "bg-purple-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.animations ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>

            {/* High Contrast */}
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("highContrast")}
            >
              <div>
                <p className="text-sm font-medium">High Contrast</p>
                <p className="text-xs text-gray-400">Increase visibility</p>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.highContrast ? "bg-purple-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.highContrast ? "translate-x-6" : "translate-x-0"
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
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
