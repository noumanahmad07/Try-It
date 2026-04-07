import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bell,
  Smartphone,
  Mail,
  Volume2,
  Save,
  Check,
} from "lucide-react";
import GlassCard from "../components/GlassCard";

export default function Notifications() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    pushNotifications: true,
    emailNotifications: true,
    tryOnReady: true,
    newFeatures: true,
    friendActivity: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
        "notificationPreferences",
        JSON.stringify(preferences),
      );

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error("Notification preferences update error:", error);
      alert("Failed to update notification preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem("notificationPreferences");
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

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
          <h1 className="text-xl font-semibold">Notifications</h1>
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
            Notification preferences updated!
          </span>
        </GlassCard>
      </motion.div>

      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {/* Push Notifications */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-400" />
            Push Notifications
          </h3>
          <div className="space-y-4">
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("pushNotifications")}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-gray-400">
                    Get alerts on your device
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.pushNotifications ? "bg-blue-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.pushNotifications
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("emailNotifications")}
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-gray-400">
                    Receive updates via email
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.emailNotifications
                    ? "bg-green-500"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.emailNotifications
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>
          </div>
        </GlassCard>

        {/* Notification Types */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
          <div className="space-y-3">
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("tryOnReady")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400 text-lg">👗</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Try-On Ready</p>
                  <p className="text-xs text-gray-400">
                    When your try-on is complete
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.tryOnReady ? "bg-purple-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.tryOnReady ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("newFeatures")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 text-lg">✨</span>
                </div>
                <div>
                  <p className="text-sm font-medium">New Features</p>
                  <p className="text-xs text-gray-400">
                    Updates about new features
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.newFeatures ? "bg-blue-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.newFeatures ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("friendActivity")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <span className="text-pink-400 text-lg">👥</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Friend Activity</p>
                  <p className="text-xs text-gray-400">
                    When friends try new looks
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.friendActivity ? "bg-pink-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.friendActivity
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>
          </div>
        </GlassCard>

        {/* Device Settings */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Device Settings</h3>
          <div className="space-y-3">
            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("soundEnabled")}
            >
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium">Sound Effects</p>
                  <p className="text-xs text-gray-400">
                    Play sounds for notifications
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.soundEnabled ? "bg-yellow-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.soundEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              onClick={() => handleToggle("vibrationEnabled")}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium">Vibration</p>
                  <p className="text-xs text-gray-400">
                    Vibrate for notifications
                  </p>
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  preferences.vibrationEnabled ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    preferences.vibrationEnabled
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
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
