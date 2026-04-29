import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  Clock, 
  Camera, 
  BarChart3, 
  Activity,
  Calendar,
  Eye
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { auth } from '../firebase';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { analytics, getAnalytics, isLoading, trackActivity } = useAnalytics();
  const [user] = useState(auth.currentUser);

  useEffect(() => {
    // Only allow admin users to access analytics
    if (!user || user.email !== 'm.noman.ahmad.dev@gmail.com') {
      navigate('/');
      return;
    }

    // Load analytics data
    getAnalytics();
    trackActivity('analytics_viewed');
  }, [user, navigate, getAnalytics, trackActivity]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (!user || user.email !== 'm.noman.ahmad.dev@gmail.com') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-4">You don't have permission to view analytics</p>
          <Link to="/" className="text-purple-400 hover:text-purple-300">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
        </motion.div>
      </div>

      <div className="max-w-[390px] mx-auto px-6 mt-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Key Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  className="p-4 rounded-lg bg-white/5 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(analytics.totalUsers)}</p>
                  <p className="text-xs text-gray-400">Total Users</p>
                </motion.div>
                
                <motion.div
                  className="p-4 rounded-lg bg-white/5 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(analytics.activeUsers)}</p>
                  <p className="text-xs text-gray-400">Active Users</p>
                </motion.div>
                
                <motion.div
                  className="p-4 rounded-lg bg-white/5 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Camera className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{formatNumber(analytics.totalTryOns)}</p>
                  <p className="text-xs text-gray-400">Total Try-Ons</p>
                </motion.div>
                
                <motion.div
                  className="p-4 rounded-lg bg-white/5 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{analytics.averageSessionDuration}m</p>
                  <p className="text-xs text-gray-400">Avg Session</p>
                </motion.div>
              </div>
            </GlassCard>

            {/* Popular Garments */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Popular Garments
              </h3>
              <div className="space-y-3">
                {analytics.popularGarments.slice(0, 5).map((garment, index) => (
                  <motion.div
                    key={garment.name}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400 text-sm font-bold">{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium">{garment.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatNumber(garment.count)}</p>
                      <p className="text-xs text-gray-400">try-ons</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Activity by Hour */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Activity by Hour
              </h3>
              <div className="space-y-2">
                {analytics.activityByHour
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 8)
                  .map((hour, index) => (
                    <motion.div
                      key={hour.hour}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <span className="text-sm text-gray-400 w-12">
                        {hour.hour}:00
                      </span>
                      <div className="flex-1 bg-white/10 rounded-full h-4 relative overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(hour.count / Math.max(...analytics.activityByHour.map(h => h.count))) * 100}%` }}
                          transition={{ delay: index * 0.1, duration: 0.5 }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {hour.count}
                      </span>
                    </motion.div>
                  ))}
              </div>
            </GlassCard>

            {/* User Growth */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                Recent User Growth
              </h3>
              <div className="space-y-2">
                {analytics.userGrowth
                  .slice(-7)
                  .reverse()
                  .map((day, index) => (
                    <motion.div
                      key={day.date}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{day.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{day.users}</span>
                        <span className="text-xs text-green-400">+{day.users}</span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </GlassCard>
          </>
        ) : (
          <GlassCard className="p-6 text-center">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No analytics data available</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
