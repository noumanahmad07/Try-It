import React, { useState } from "react";
import { Link } from "react-router";
import { LogOut, Settings } from "lucide-react";
import GlassCard from "./GlassCard";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useSettings } from "../contexts/SettingsContext";

interface UserMenuProps {
  user: any;
}

export default function UserMenu({ user }: UserMenuProps) {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
      >
        
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {user?.email
                ? user.email.charAt(0).toUpperCase()
                : user?.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : "U"}
            </span>
          </div>
       
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <GlassCard className="absolute right-0 top-12 w-64 p-4 z-20">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              {(
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    {user?.email
                      ? user.email.charAt(0).toUpperCase()
                      : user?.displayName
                        ? user.displayName.charAt(0).toUpperCase()
                        : "U"}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {settings.profile.displayName ||
                    user.displayName ||
                    user.email}
                </p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                to="/settings"
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 transition-colors text-left text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Log Out</span>
              </button>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
