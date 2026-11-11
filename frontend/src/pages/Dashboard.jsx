import React, { useState, useEffect } from 'react';
import { RefreshCw, Newspaper, ArrowRight, ExternalLink, Activity } from 'lucide-react';
import { fetchNews, triggerNewsFetch } from '../services/api';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const loadNews = async () => {
    try {
      setLoading(true);
      const response = await fetchNews();
      setArticles(response.data);
    } catch (error) {
      console.error("Failed to fetch news", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleFetchLatest = async () => {
    try {
      setFetching(true);
      await triggerNewsFetch();
      // Wait a few seconds for background task to populate DB
      setTimeout(loadNews, 3000);
    } catch (error) {
      console.error("Failed to trigger fetch", error);
    } finally {
      setTimeout(() => setFetching(false), 3000);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Today's Pulse</h1>
          <p className="text-gray-400 text-lg">AI news aggregation and instant text-to-speech podcast generation.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleFetchLatest}
            disabled={fetching}
            className="btn-secondary py-2.5 px-4 rounded-xl text-sm"
          >
            <RefreshCw size={16} className={fetching ? 'animate-spin text-primary' : ''} />
            {fetching ? 'Syncing Feeds...' : 'Sync RSS Feeds'}
          </button>
          
          <Link to="/generator" className="btn-primary py-2.5 px-5 rounded-xl text-sm font-bold flex items-center gap-2">
            <Activity size={16} />
            Create Podcast
          </Link>
        </div>
      </header>

      {/* Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative overflow-hidden flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold px-3 py-1 bg-primary/20 text-primary rounded-full uppercase tracking-wider border border-primary/30">
              Live News Outlets
            </span>
            <h3 className="text-xl font-bold text-white">The Hindu, NDTV, Times of India & More</h3>
            <p className="text-gray-300 text-xs leading-relaxed">
              Auto-fetch breaking headlines across National, Business, Tech, and Science to create daily audio news briefings in Indian or Global voices.
            </p>
          </div>
          <Link 
            to="/generator" 
            className="btn-primary py-2.5 px-5 rounded-xl font-bold flex items-center justify-center gap-2 self-start text-sm shadow-md shadow-primary/20"
          >
            Launch News Studio <ArrowRight size={15} />
          </Link>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent relative overflow-hidden flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold px-3 py-1 bg-accent/20 text-accent rounded-full uppercase tracking-wider border border-accent/30">
              Custom Article Input
            </span>
            <h3 className="text-xl font-bold text-white">Paste Any News Story or Editorial</h3>
            <p className="text-gray-300 text-xs leading-relaxed">
              Paste specific text or articles directly to synthesize a customized conversational podcast episode with Groq AI and Edge-TTS.
            </p>
          </div>
          <Link 
            to="/generator" 
            className="btn-secondary py-2.5 px-5 rounded-xl font-bold flex items-center justify-center gap-2 self-start text-sm hover:border-accent/40"
          >
            Paste Article Text <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Available Stories", value: articles.length, color: "text-blue-400" },
          { label: "Categories Active", value: new Set(articles.map(a => a.category)).size, color: "text-purple-400" },
          { label: "AI Processed", value: "Ready", color: "text-emerald-400" }
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Newspaper className="text-primary" /> Recent Articles
        </h2>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {articles.slice(0, 10).map((article, idx) => (
              <div key={article.id} className="glass-panel p-6 hover:border-primary/30 transition-colors animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold bg-primary/20 text-primary px-3 py-1 rounded-full">
                    {article.category || 'General'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(article.published_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-tight">{article.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2 mb-4">{article.content}</p>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    Source: <span className="text-gray-300">{article.source}</span>
                  </span>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-blue-400 transition-colors flex items-center gap-1 text-sm font-medium">
                    Read original <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
