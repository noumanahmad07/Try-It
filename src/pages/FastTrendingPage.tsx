import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './FastTrendingPage.css';
import { ChevronLeft, Info } from 'lucide-react';
import { withRetry } from '../lib/utils';

interface TrendingItem {
  id: string;
  source: string;
  image_url: string;
  thumb_url: string;
  title: string;
  likes: number;
  downloads: number;
  trend_score: number;
  photographer?: string;
  photographer_url?: string;
  date: string;
}

interface FastTrendingPageProps {
  onBack: () => void;
  onTryOn: (url: string) => void;
}

const FastTrendingPage: React.FC<FastTrendingPageProps> = ({ onBack, onTryOn }) => {
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startTime = performance.now();
      const response = await withRetry(() => axios.get('/api/trending/fast'));
      const endTime = performance.now();
      
      console.log(`Trending fetched in ${(endTime - startTime) / 1000} seconds`);
      
      setTrendingItems(response.data.trending_items);
      setLastUpdated(response.data.last_updated);
    } catch (err) {
      setError('Failed to fetch trending items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTrending = async () => {
    try {
      setRefreshing(true);
      await axios.post('/api/trending/refresh');
      await fetchTrending();
    } catch (err) {
      setError('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrending();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  const sources = ['all', 'unsplash', 'pexels', 'pixabay'];
  
  const filteredItems = selectedSource === 'all' 
    ? trendingItems 
    : trendingItems.filter(item => item.source === selectedSource);

  if (loading && !refreshing) {
    return (
    <div className="fast-trending-container bg-bg-primary text-text-primary">
      <div className="loading-state">
        <div className="pulse-loader"></div>
        <h2 className="text-text-primary">Discovering Trends</h2>
        <p className="text-text-secondary">Fetching latest fashion from across the web...</p>
      </div>
    </div>
    );
  }

  return (
    <div className="fast-trending-container bg-bg-primary text-text-primary">
      <header className="trending-header">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="p-2 -ml-2 mr-4 glass rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-brand-gradient">
            🔥 Trending Fashion
          </h1>
        </div>
        
        <div className="header-content">
          {lastUpdated && (
            <div className="update-info">
              <span className="last-updated text-text-muted">
                Updated: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
              <button 
                className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                onClick={refreshTrending}
                disabled={refreshing}
              >
                {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
              </button>
            </div>
          )}
        </div>
        
        <div className="source-filters">
          {sources.map(source => (
            <button
              key={source}
              className={`source-btn ${selectedSource === source ? 'active' : ''}`}
              onClick={() => setSelectedSource(source)}
            >
              {source.charAt(0).toUpperCase() + source.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={fetchTrending}>Try Again</button>
        </div>
      )}

      {trendingItems.length > 0 && trendingItems[0].source === 'mirrorfit' && (
        <div className="bg-brand-pink/10 border border-brand-pink/20 p-4 rounded-2xl mb-8 text-sm text-brand-pink flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5" />
            <span>Showing curated trends. Add Unsplash/Pexels keys in Secrets for live web data.</span>
          </div>
        </div>
      )}

      <div className="trending-grid">
        {filteredItems.map((item) => (
            <div key={`${item.source}-${item.id}`} className="trending-card bg-bg-secondary border-white/[0.05] shadow-xl shadow-black/20">
              <div className="card-media">
              <img 
                src={item.image_url} 
                alt={item.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e: any) => {
                  e.target.src = 'https://via.placeholder.com/400x500?text=Fashion';
                }}
              />
              <div className="card-overlay">
                <span className="trend-badge">
                  🔥 {item.trend_score}
                </span>
                <span className="source-indicator">
                  {item.source}
                </span>
              </div>
              {item.photographer && (
                <div className="photographer">
                  📸 {item.photographer}
                </div>
              )}
            </div>
            
            <div className="card-content">
              <h3 className="text-text-primary truncate">{item.title}</h3>
              
              <div className="card-stats">
                {item.likes > 0 && (
                  <span className="stat text-text-secondary">
                    ❤️ {item.likes.toLocaleString()}
                  </span>
                )}
                {item.downloads > 0 && (
                  <span className="stat text-text-secondary">
                    ⬇️ {item.downloads.toLocaleString()}
                  </span>
                )}
              </div>
              
              <button 
                className="try-on-btn"
                onClick={() => onTryOn(item.image_url)}
              >
                Try This Style
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && !loading && (
        <div className="empty-state">
          <p>No trending items found</p>
        </div>
      )}
    </div>
  );
};

export default FastTrendingPage;
