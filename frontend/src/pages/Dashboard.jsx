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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#fafafa] mb-2 tracking-tight">Today's Pulse</h1>
          <p className="text-[#a3a3a3] text-base">Curated news intelligence and multi-host podcast synthesis.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={handleFetchLatest}
            disabled={fetching}
            className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold"
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin text-white' : ''} />
            {fetching ? 'Syncing Feeds...' : 'Sync RSS Feeds'}
          </button>
          
          <Link to="/generator" className="btn-primary py-2.5 px-5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Activity size={14} />
            Create Podcast
          </Link>
        </div>
      </header>

      {/* Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] hover:border-white/[0.16] bg-surface transition-colors flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-white/[0.06] text-[#fafafa] rounded-full uppercase tracking-wider border border-white/[0.12] inline-block">
              Live News Outlets
            </span>
            <h3 className="text-xl font-bold text-[#fafafa] tracking-tight">The Hindu, NDTV, Times of India & More</h3>
            <p className="text-[#a3a3a3] text-xs leading-relaxed">
              Auto-fetch breaking headlines across National, Business, Tech, and Science to create daily audio news briefings in Indian or Global voices.
            </p>
          </div>
          <Link 
            to="/generator" 
            className="btn-primary py-2 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 self-start text-xs"
          >
            Launch News Studio <ArrowRight size={14} />
          </Link>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] hover:border-white/[0.16] bg-surface transition-colors flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-white/[0.06] text-[#fafafa] rounded-full uppercase tracking-wider border border-white/[0.12] inline-block">
              Custom Article Input
            </span>
            <h3 className="text-xl font-bold text-[#fafafa] tracking-tight">Paste Any News Story or Editorial</h3>
            <p className="text-[#a3a3a3] text-xs leading-relaxed">
              Paste specific text or articles directly to synthesize a customized conversational podcast episode with Groq AI and Edge-TTS.
            </p>
          </div>
          <Link 
            to="/generator" 
            className="btn-secondary py-2 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 self-start text-xs"
          >
            Paste Article Text <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Available Stories", value: articles.length },
          { label: "Categories Active", value: new Set(articles.map(a => a.category)).size },
          { label: "Pipeline Status", value: "Ready" }
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6">
            <p className="text-xs text-[#737373] font-medium uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-[#fafafa] tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold text-[#fafafa] mb-6 flex items-center gap-2.5 tracking-tight">
          <Newspaper size={20} className="text-white" /> Recent Articles
        </h2>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {articles.slice(0, 10).map((article) => (
              <div key={article.id} className="glass-panel p-6 hover:border-white/[0.18] transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[11px] font-medium bg-white/[0.05] text-[#a3a3a3] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                      {article.category || 'General'}
                    </span>
                    <span className="text-xs text-[#737373]">
                      {new Date(article.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#fafafa] mb-2 leading-snug tracking-tight">{article.title}</h3>
                  <p className="text-[#a3a3a3] text-xs line-clamp-2 mb-4 leading-relaxed">{article.content}</p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/[0.06] mt-auto">
                  <span className="text-xs font-medium text-[#737373] flex items-center gap-1">
                    Source: <span className="text-[#a3a3a3]">{article.source}</span>
                  </span>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#fafafa] hover:underline transition-colors flex items-center gap-1">
                    Read original <ExternalLink size={12} />
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
