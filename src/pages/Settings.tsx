import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Shield, LogOut, Camera } from "lucide-react";
import GlassCard from "../components/GlassCard";
import { auth } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  // Track user authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      console.log(
        "Settings - Auth state changed:",
        user ? "User logged in" : "User logged out",
      );
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: Shield,
          label: "Privacy & Security",
          description: "Password and privacy settings",
          action: () => navigate("/privacy-security"),
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Camera,
          label: "Camera Settings",
          description: "Photo quality and camera preferences",
          action: () => navigate("/camera-settings"),
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
          <Link to="/">
            <motion.button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </motion.div>
      </div>

      {/* User Profile Card */}
      <div className="max-w-[390px] mx-auto px-6 mt-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                {user?.email
                  ? user.email.charAt(0).toUpperCase()
                  : user?.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : "U"}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {user?.displayName || "User"}
              </h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-green-500 text-sm">Verified Account</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Settings Sections */}
      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {settingsSections.map((section, sectionIndex) => (
          <GlassCard className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <motion.button
                  key={item.label}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                  onClick={() => item.action()}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay:
                      (sectionIndex * settingsSections.length + itemIndex) *
                      0.05,
                    duration: 0.3,
                  }}
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Logout Button */}
      <div className="max-w-[390px] mx-auto px-6 mt-6 mb-8">
        <GlassCard className="p-4">
          <motion.button
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </motion.button>
        </GlassCard>
      </div>
    </div>
  );
}
