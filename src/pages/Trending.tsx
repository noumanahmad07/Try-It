import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, TrendingUp, Sparkles, Heart, Eye, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { vibrate, cn } from '../lib/utils';
import { TrendingItem } from '../types';

interface TrendingProps {
  onBack: () => void;
  onTryOn: (garmentUrl: string) => void;
}

export default function Trending({ onBack, onTryOn }: TrendingProps) {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [lastUpdated] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const fetchTrending = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/trending/fast');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      const formattedItems = data.trending_items.map((item: any) => ({
        id: item.id,
        name: item.title,
        price: `$${Math.floor(Math.random() * 100) + 40}`,
        imageUrl: item.image_url,
        category: item.source === 'unsplash' ? 'Streetwear' : item.source === 'pexels' ? 'Formal' : 'Minimalist',
        targetAge: 'All',
        views: item.likes * 15 + Math.floor(Math.random() * 1000),
        likes: item.likes
      }));

      setItems(formattedItems);
    } catch (err) {
      console.error("Failed to fetch trending:", err);
      setItems([
        { id: '1', name: 'Vibrant Floral Dress', price: '$89', imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80', category: 'Formal', targetAge: 'All' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, []);

  const filteredItems = filter === 'All' ? items : items.filter(i => i.targetAge.includes(filter) || i.category === filter);

  return (
    <div className="trending-container min-h-screen">
      <header className="trending-header">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="p-2 glass rounded-full hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="flex items-center justify-center gap-3">
              <TrendingUp className="w-10 h-10 text-brand-pink" />
              Trending Now
            </h1>
            <p className="last-updated">Last updated: {lastUpdated}</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="category-filters">
          {['All', 'Streetwear', 'Formal', 'Vintage', 'Minimalist', 'Boho'].map((f) => (
            <button
              key={f}
              onClick={() => { vibrate(); setFilter(f); }}
              className={cn("category-btn", filter === f && "active")}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main>
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p className="text-gray-400 font-medium animate-pulse">Analyzing global fashion trends...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="trending-grid">
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="trending-card"
              >
                <div className="image-container">
                  <img 
                    src={item.imageUrl} 
                    className="trending-image" 
                    alt={item.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="trending-badge">#1 TRENDING</div>
                  <div className="source-badge">AI CURATED</div>
                </div>
                <div className="card-content">
                  <h3>{item.name}</h3>
                  <p className="caption">Perfect for {item.targetAge} looking for a {item.category.toLowerCase()} aesthetic.</p>
                  
                  <div className="metrics">
                    <div className="metric">
                      <Eye className="w-4 h-4" />
                      <span>{(item as any).views?.toLocaleString()} views</span>
                    </div>
                    <div className="metric">
                      <Heart className="w-4 h-4" />
                      <span>{(item as any).likes?.toLocaleString()} likes</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-brand-indigo font-bold text-xl">{item.price}</span>
                    <span className="text-gray-500 text-sm uppercase tracking-wider">{item.category}</span>
                  </div>

                  <button 
                    onClick={() => onTryOn(item.imageUrl)}
                    className="try-on-btn flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Try On with MirrorFit
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No trending items found for this category.</p>
          </div>
        )}

        {!isLoading && (
          <button onClick={fetchTrending} className="refresh-btn flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Refresh Trends
          </button>
        )}
      </main>
    </div>
  );
}
