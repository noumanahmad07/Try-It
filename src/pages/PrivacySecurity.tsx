import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertTriangle,
} from "lucide-react";
import GlassCard from "../components/GlassCard";
import { auth } from "../firebase";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

export default function PrivacySecurity() {
  const navigate = useNavigate();
  const [user] = useState(auth.currentUser);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const validateForm = () => {
    const newErrors = {
      currentPassword: formData.currentPassword
        ? ""
        : "Current password is required",
      newPassword:
        formData.newPassword.length >= 8
          ? ""
          : "Password must be at least 8 characters",
      confirmPassword:
        formData.newPassword === formData.confirmPassword
          ? ""
          : "Passwords do not match",
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Password change form submitted", formData);

    if (!validateForm() || !user) {
      console.log("Validation failed or no user");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Starting password update for user:", user.email);

      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(
        user.email!,
        formData.currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      console.log("Reauthentication successful");

      // Update password
      await updatePassword(user, formData.newPassword);
      console.log("Password updated successfully");

      setIsSuccess(true);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: any) {
      console.error("Password update error:", error);
      if (error.code === "auth/wrong-password") {
        setErrors((prev) => ({
          ...prev,
          currentPassword: "Current password is incorrect",
        }));
      } else if (error.code === "auth/too-many-requests") {
        setErrors((prev) => ({
          ...prev,
          currentPassword: "Too many attempts. Try again later",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          currentPassword: "Failed to update password: " + error.message,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const privacySettings = [
    {
      title: "Data Privacy",
      items: [
        {
          label: "Profile Visibility",
          value: "Public",
          description: "Control who can see your profile",
        },
        {
          label: "Data Collection",
          value: "Minimal",
          description: "We only collect necessary data",
        },
        {
          label: "Analytics",
          value: "Enabled",
          description: "Help us improve the app",
        },
      ],
    },
    {
      title: "Security Settings",
      items: [
        {
          label: "Two-Factor Auth",
          value: "Not Enabled",
          description: "Add extra security layer",
        },
        {
          label: "Login Alerts",
          value: "Enabled",
          description: "Get notified of new logins",
        },
        {
          label: "Session Timeout",
          value: "30 days",
          description: "Auto-logout period",
        },
      ],
    },
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
          <h1 className="text-xl font-semibold">Privacy & Security</h1>
        </motion.div>
      </div>

      {/* Success Message */}
      {isSuccess && (
        <motion.div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="px-4 py-3 flex items-center gap-3 bg-green-500/20 border-green-500/50">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">
              Password updated successfully!
            </span>
          </GlassCard>
        </motion.div>
      )}

      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {/* Password Change */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            Change Password
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.currentPassword
                      ? "border-red-500"
                      : "border-white/20"
                  }`}
                  placeholder="Enter current password"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.newPassword ? "border-red-500" : "border-white/20"
                  }`}
                  placeholder="Enter new password"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : "border-white/20"
                  }`}
                  placeholder="Confirm new password"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </GlassCard>

        {/* Privacy Settings */}
        {privacySettings.map((section, index) => (
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              {section.title}
            </h3>
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <motion.div
                  key={item.label}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: (index * 2 + itemIndex) * 0.1,
                    duration: 0.3,
                  }}
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{item.value}</span>
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
