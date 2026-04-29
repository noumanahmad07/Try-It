import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Download, Trash2, Save, Check, Calendar, Image } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function ExportData() {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate data export
      const userData = {
        profile: {
          name: 'Noman Ahmad',
          email: 'm.noman.ahmad.dev@gmail.com',
          joinDate: '2024-01-15'
        },
        tryOnHistory: [
          {
            id: '1',
            date: '2024-03-10',
            garment: 'Blue Dress',
            result: 'success'
          },
          {
            id: '2', 
            date: '2024-03-12',
            garment: 'Red Top',
            result: 'success'
          }
        ],
        preferences: {
          theme: 'dark',
          notifications: true,
          cameraQuality: 'high'
        }
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zephora-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Simulate cache clearing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear localStorage
      const keysToKeep = ['userPreferences', 'emailPreferences'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear session storage
      sessionStorage.clear();

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error('Clear cache error:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

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
          <h1 className="text-xl font-semibold">Export Data</h1>
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
          <span className="text-green-400 font-medium">Operation completed successfully!</span>
        </GlassCard>
      </motion.div>

      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {/* Export Section */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            Export Your Data
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            Download all your try-on history, preferences, and profile data in JSON format.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium mb-3">What's included:</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>Profile information and preferences</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span>Complete try-on history</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span>Settings and configurations</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export All Data
                </>
              )}
            </button>
          </div>
        </GlassCard>

        {/* Clear Cache Section */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Clear Cache
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            Remove temporary files and cached data to free up space.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium mb-3">What will be cleared:</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  <span>Temporary image files</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span>Session storage data</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span>Application cache</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium rounded-lg hover:from-red-600 hover:to-orange-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isClearing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Clear Cache
                </>
              )}
            </button>
          </div>
        </GlassCard>

        {/* Storage Info */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />
            Storage Information
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-gray-400">Data Last Exported</span>
              <span className="text-sm font-medium">Never</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-gray-400">Cache Size</span>
              <span className="text-sm font-medium">~124 MB</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-gray-400">Total Try-Ons</span>
              <span className="text-sm font-medium">47</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
