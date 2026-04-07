import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';

interface UserActivity {
  userId: string;
  action: string;
  timestamp: Timestamp;
  metadata?: any;
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalTryOns: number;
  averageSessionDuration: number;
  popularGarments: Array<{ name: string; count: number }>;
  userGrowth: Array<{ date: string; users: number }>;
  activityByHour: Array<{ hour: number; count: number }>;
}

interface AnalyticsContextType {
  trackActivity: (action: string, metadata?: any) => void;
  getAnalytics: () => Promise<UserAnalytics>;
  getUserActivity: (userId: string) => Promise<UserActivity[]>;
  analytics: UserAnalytics | null;
  isLoading: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track user activity
  const trackActivity = async (action: string, metadata?: any) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const activity: UserActivity = {
        userId: user.uid,
        action,
        timestamp: Timestamp.now(),
        metadata
      };

      await setDoc(doc(collection(db, 'userActivity')), activity);
      
      // Update user's last activity
      await setDoc(doc(db, 'users', user.uid), {
        lastActivity: Timestamp.now(),
        ...metadata
      }, { merge: true });

    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  // Get comprehensive analytics
  const getAnalytics = async (): Promise<UserAnalytics> => {
    setIsLoading(true);
    try {
      // Get total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Get active users (last 7 days)
      const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const activeUsersQuery = query(
        collection(db, 'users'),
        where('lastActivity', '>=', sevenDaysAgo)
      );
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const activeUsers = activeUsersSnapshot.size;

      // Get total try-ons
      const tryOnsQuery = query(
        collection(db, 'userActivity'),
        where('action', '==', 'try_on_completed')
      );
      const tryOnsSnapshot = await getDocs(tryOnsQuery);
      const totalTryOns = tryOnsSnapshot.size;

      // Get popular garments
      const garmentsQuery = query(
        collection(db, 'userActivity'),
        where('action', '==', 'try_on_completed'),
        limit(100)
      );
      const garmentsSnapshot = await getDocs(garmentsQuery);
      const garmentCounts: { [key: string]: number } = {};
      
      garmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.metadata?.garmentName) {
          garmentCounts[data.metadata.garmentName] = 
            (garmentCounts[data.metadata.garmentName] || 0) + 1;
        }
      });

      const popularGarments = Object.entries(garmentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get user growth (last 30 days)
      const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const growthQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', thirtyDaysAgo),
        orderBy('createdAt')
      );
      const growthSnapshot = await getDocs(growthQuery);
      
      const userGrowth: { [key: string]: number } = {};
      growthSnapshot.docs.forEach(doc => {
        const date = new Date(doc.data().createdAt?.toDate()).toLocaleDateString();
        userGrowth[date] = (userGrowth[date] || 0) + 1;
      });

      // Get activity by hour
      const activityQuery = query(
        collection(db, 'userActivity'),
        limit(1000)
      );
      const activitySnapshot = await getDocs(activityQuery);
      const activityByHour: number[] = new Array(24).fill(0);
      
      activitySnapshot.docs.forEach(doc => {
        const hour = doc.data().timestamp?.toDate().getHours() || 0;
        activityByHour[hour]++;
      });

      const analyticsData: UserAnalytics = {
        totalUsers,
        activeUsers,
        totalTryOns,
        averageSessionDuration: 15, // Placeholder - would need session tracking
        popularGarments,
        userGrowth: Object.entries(userGrowth).map(([date, users]) => ({ date, users })),
        activityByHour: activityByHour.map((count, hour) => ({ hour, count }))
      };

      setAnalytics(analyticsData);
      return analyticsData;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get specific user activity
  const getUserActivity = async (userId: string): Promise<UserActivity[]> => {
    try {
      const activityQuery = query(
        collection(db, 'userActivity'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(activityQuery);
      return snapshot.docs.map(doc => ({
        userId: doc.data().userId,
        action: doc.data().action,
        timestamp: doc.data().timestamp,
        metadata: doc.data().metadata
      }));
    } catch (error) {
      console.error('Error getting user activity:', error);
      return [];
    }
  };

  return (
    <AnalyticsContext.Provider
      value={{
        trackActivity,
        getAnalytics,
        getUserActivity,
        analytics,
        isLoading
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};
