import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Mail, Bell, Save, Check } from "lucide-react";
import GlassCard from "../components/GlassCard";

export default function EmailPreferences() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    marketingEmails: true,
    productUpdates: true,
    newsletter: false,
    securityAlerts: true,
    loginNotifications: true,
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
      localStorage.setItem("emailPreferences", JSON.stringify(preferences));

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error("Email preferences update error:", error);
      alert("Failed to update email preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem("emailPreferences");
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
          <h1 className="text-xl font-semibold">Email Preferences</h1>
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
            Email preferences updated!
          </span>
        </GlassCard>
      </motion.div>

      {/* Email Preferences Form */}
      <div className="max-w-[390px] mx-auto px-6 mt-6">
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Communication Preferences
              </h3>

              {/* Marketing Emails */}
              <motion.div
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                onClick={() => handleToggle("marketingEmails")}
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium">Marketing Emails</p>
                    <p className="text-xs text-gray-400">
                      Promotions, special offers, and new features
                    </p>
                  </div>
                </div>
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    preferences.marketingEmails
                      ? "bg-purple-500"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                      preferences.marketingEmails
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </motion.div>

              {/* Product Updates */}
              <motion.div
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                onClick={() => handleToggle("productUpdates")}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">Product Updates</p>
                    <p className="text-xs text-gray-400">
                      New features and improvements
                    </p>
                  </div>
                </div>
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    preferences.productUpdates ? "bg-blue-500" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                      preferences.productUpdates
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </motion.div>

              {/* Newsletter */}
              <motion.div
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                onClick={() => handleToggle("newsletter")}
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium">Monthly Newsletter</p>
                    <p className="text-xs text-gray-400">
                      Fashion tips and trends
                    </p>
                  </div>
                </div>
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    preferences.newsletter ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                      preferences.newsletter ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
              </motion.div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Security Notifications
              </h3>

              {/* Security Alerts */}
              <motion.div
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                onClick={() => handleToggle("securityAlerts")}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium">Security Alerts</p>
                    <p className="text-xs text-gray-400">
                      Login attempts and security changes
                    </p>
                  </div>
                </div>
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    preferences.securityAlerts ? "bg-red-500" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                      preferences.securityAlerts
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </motion.div>

              {/* Login Notifications */}
              <motion.div
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                onClick={() => handleToggle("loginNotifications")}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium">Login Notifications</p>
                    <p className="text-xs text-gray-400">New device sign-ins</p>
                  </div>
                </div>
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    preferences.loginNotifications
                      ? "bg-yellow-500"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                      preferences.loginNotifications
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </motion.div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
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
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
