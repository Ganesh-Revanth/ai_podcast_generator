import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Clock, 
  Headphones, 
  AlertCircle, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  Plus,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { getEpisodes, deleteEpisode, BASE_URL } from '../services/api';
import { Link } from 'react-router-dom';

const Player = () => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedScript, setExpandedScript] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(null);
  const [expandedFactCheck, setExpandedFactCheck] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchEpisodes = async () => {
    try {
      const response = await getEpisodes();
      setEpisodes(response.data);
    } catch (error) {
      console.error("Failed to fetch episodes", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
    // Poll every 4 seconds if there are pending episodes
    const interval = setInterval(() => {
      if (episodes.some(ep => ep.status === 'pending' || ep.status === 'script_generated')) {
        fetchEpisodes();
      }
    }, 4000);
    
    return () => clearInterval(interval);
  }, [episodes]);

  const toggleScript = (id) => {
    setExpandedScript(expandedScript === id ? null : id);
  };

  const toggleNotes = (id) => {
    setExpandedNotes(expandedNotes === id ? null : id);
  };

  const toggleFactCheck = (id) => {
    setExpandedFactCheck(expandedFactCheck === id ? null : id);
  };

  const handleCopyScript = (id, script) => {
    navigator.clipboard.writeText(script);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this podcast episode?")) return;
    try {
      await deleteEpisode(id);
      setEpisodes(prev => prev.filter(ep => ep.id !== id));
    } catch (err) {
      console.error("Failed to delete episode", err);
    }
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Podcast Library</h1>
          <p className="text-gray-400 text-lg">Listen to, read, and manage your AI-synthesized news podcasts.</p>
        </div>
        <Link 
          to="/generator" 
          className="btn-primary py-2.5 px-5 text-sm font-semibold rounded-xl flex items-center gap-2"
        >
          <Plus size={16} /> New Podcast
        </Link>
      </header>

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : episodes.length === 0 ? (
        <div className="glass-panel p-16 text-center flex flex-col items-center rounded-3xl border border-white/10">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-5 shadow-inner">
            <Headphones size={36} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No episodes generated yet</h3>
          <p className="text-gray-400 max-w-md mb-6">
            Paste any news article or pick RSS stories to create your very first audio podcast.
          </p>
          <Link to="/generator" className="btn-primary flex items-center gap-2">
            <Sparkles size={18} /> Open AI Studio
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {episodes.map((episode) => {
            const isCustomArticle = episode.articles && episode.articles.some(a => a.source === 'Custom Article Input' || a.category === 'Custom');
            let parsedFlags = [];
            try {
              if (episode.fact_check_flags) {
                parsedFlags = JSON.parse(episode.fact_check_flags);
              }
            } catch {
              parsedFlags = [];
            }
            
            return (
              <div 
                key={episode.id} 
                className="glass-panel overflow-hidden transition-all duration-300 hover:border-primary/30 rounded-3xl border border-white/10 shadow-lg"
              >
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  
                  {/* Artwork / Icon Badge */}
                  <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl border border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-accent/30 opacity-40 group-hover:opacity-80 transition-opacity"></div>
                    <Headphones size={38} className="text-white group-hover:scale-110 transition-transform duration-500 z-10" />
                    
                    {episode.status === 'completed' && (
                      <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.9)] z-20"></div>
                    )}
                    {(episode.status === 'pending' || episode.status === 'script_generated') && (
                      <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-yellow-500 rounded-full animate-ping shadow-[0_0_12px_rgba(234,179,8,0.9)] z-20"></div>
                    )}
                    {episode.status === 'failed' && (
                      <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-red-500 rounded-full z-20"></div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isCustomArticle 
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {isCustomArticle ? 'Article Text Input' : 'RSS News Feed'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={12} /> {new Date(episode.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white leading-snug">
                          {episode.title}
                        </h3>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Fact Check Badge */}
                        {episode.fact_check_status === 'passed' && (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 flex items-center gap-1.5" title="All claims verified against source articles">
                            <ShieldCheck size={13} /> Verified
                          </span>
                        )}

                        {episode.fact_check_status === 'flagged' && (
                          <button
                            type="button"
                            onClick={() => toggleFactCheck(episode.id)}
                            className="px-2.5 py-1 bg-amber-500/15 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30 flex items-center gap-1.5 hover:bg-amber-500/25 transition-colors cursor-pointer"
                            title="Click to view flagged claims"
                          >
                            <ShieldAlert size={13} className="text-amber-400" />
                            Fact-Check: {parsedFlags.length} Flagged
                            {expandedFactCheck === episode.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                          </button>
                        )}

                        {/* Readiness Status */}
                        {episode.status === 'completed' && (
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30 uppercase tracking-wider">
                            Ready
                          </span>
                        )}
                        {(episode.status === 'pending' || episode.status === 'script_generated') && (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div> Synthesizing...
                          </span>
                        )}
                        {episode.status === 'failed' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30 uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle size={14}/> Failed
                            </span>
                            {episode.error_message && (
                              <span className="text-xs text-red-400/90 text-right max-w-xs md:max-w-md truncate" title={episode.error_message}>
                                {episode.error_message}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio Player */}
                    {episode.status === 'completed' && episode.audio_url && (
                      <div className="pt-2">
                        <audio 
                          controls 
                          className="w-full h-11 bg-white/5 border border-white/10 rounded-xl"
                        >
                          <source src={`${BASE_URL}${episode.audio_url}`} type="audio/mpeg" />
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="border-t border-white/5 bg-black/30 p-4 px-6 md:px-8 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => toggleScript(episode.id)}
                      className="flex items-center gap-2 text-sm text-gray-300 hover:text-white font-medium transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
                    >
                      <FileText size={16} className="text-primary" />
                      {expandedScript === episode.id ? 'Hide Script' : 'Read Podcast Script'}
                      {expandedScript === episode.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>

                    {episode.articles && episode.articles.length > 0 && (
                      <button 
                        onClick={() => toggleNotes(episode.id)}
                        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white font-medium transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
                      >
                        <BookOpen size={16} className="text-accent" />
                        {expandedNotes === episode.id ? 'Hide Sources' : `Show Notes (${episode.articles.length})`}
                        {expandedNotes === episode.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                    )}

                    {episode.script && (
                      <button
                        onClick={() => handleCopyScript(episode.id, episode.script)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                        title="Copy script to clipboard"
                      >
                        {copiedId === episode.id ? (
                          <>
                            <Check size={14} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {episode.status === 'completed' && episode.audio_url && (
                      <a 
                        href={`${BASE_URL}${episode.audio_url}`}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:text-blue-300 font-semibold transition-colors"
                      >
                        <Download size={16} /> Download MP3
                      </a>
                    )}

                    <button
                      onClick={() => handleDelete(episode.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                      title="Delete Episode"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Show Notes & Sources Drawer */}
                {expandedNotes === episode.id && episode.articles && (
                  <div className="p-6 md:p-8 bg-black/40 border-t border-white/10 animate-slide-up space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-accent"/>
                        <h4 className="text-white font-bold text-base">Show Notes & Referenced Sources</h4>
                      </div>
                      <span className="text-xs text-gray-400">
                        {episode.articles.length} verified news reference{episode.articles.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {episode.articles.map((art) => {
                        const isCustom = art.source === 'Custom Article Input' || art.url?.startsWith('custom://');
                        return (
                          <div 
                            key={art.id} 
                            className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/20 text-accent border border-accent/30 uppercase">
                                  {art.source}
                                </span>
                                {art.category && (
                                  <span className="text-[11px] text-gray-400">
                                    • {art.category}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-semibold text-gray-200 line-clamp-2 leading-snug">
                                {art.title}
                              </h5>
                            </div>

                            {isCustom ? (
                              <span className="text-xs text-gray-500 italic">User-provided text input</span>
                            ) : (
                              <a
                                href={art.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-blue-300 font-medium transition-colors"
                              >
                                Read original article <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fact-Check Flags Drawer */}
                {expandedFactCheck === episode.id && parsedFlags.length > 0 && (
                  <div className="p-6 md:p-8 bg-amber-950/20 border-t border-amber-500/20 animate-slide-up space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-300">
                        <ShieldAlert size={18} />
                        <h4 className="font-bold text-base">Fact-Check Review ({parsedFlags.length} Flagged Claims)</h4>
                      </div>
                      <span className="text-xs text-amber-300/80">
                        Verified by Secondary LLM Validator
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {parsedFlags.map((flag, fIdx) => (
                        <div 
                          key={fIdx} 
                          className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-amber-200 text-sm">
                              Claim #{fIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                flag.severity === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                flag.severity === 'low' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                Severity: {flag.severity || 'medium'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 uppercase">
                                {flag.status || 'unsupported'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 text-gray-300 italic">
                            "{flag.claim}"
                          </div>

                          <div className="text-gray-400">
                            <span className="text-amber-400/90 font-medium">Issue: </span>
                            {flag.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script Expansion Drawer */}
                {expandedScript === episode.id && episode.script && (
                  <div className="p-6 md:p-8 bg-black/50 border-t border-white/10 animate-slide-up">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-white font-bold flex items-center gap-2 text-base">
                        <FileText size={18} className="text-primary"/> Spoken Narration Script
                      </h4>
                      <button
                        onClick={() => handleCopyScript(episode.id, episode.script)}
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        {copiedId === episode.id ? 'Copied to clipboard' : 'Copy entire script'}
                      </button>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-gray-200 text-sm md:text-base leading-relaxed space-y-4 font-sans whitespace-pre-wrap">
                      {episode.script}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Player;

