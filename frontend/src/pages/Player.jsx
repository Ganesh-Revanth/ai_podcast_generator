import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Clock, 
  Headphones, 
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
  ShieldAlert,
  Play,
  Pause,
  ListPlus,
  Rss
} from 'lucide-react';
import { getEpisodes, deleteEpisode, getGlobalFeedUrl, BASE_URL } from '../services/api';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import PipelineStepper from '../components/PipelineStepper';
import SynchronizedTranscript from '../components/SynchronizedTranscript';
import { Link } from 'react-router-dom';

const formatDuration = (secs) => {
  if (!secs || isNaN(secs)) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const Player = () => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTranscript, setExpandedTranscript] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(null);
  const [expandedFactCheck, setExpandedFactCheck] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedFeed, setCopiedFeed] = useState(false);

  const {
    currentEpisode,
    isPlaying,
    currentTime,
    playEpisode,
    seek,
    addToQueue
  } = useAudioPlayer();

  const fetchEpisodes = async () => {
    try {
      const response = await getEpisodes();
      setEpisodes(response.data);
    } catch (error) {
      console.error('Failed to fetch episodes', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const toggleTranscript = (id) => {
    setExpandedTranscript(expandedTranscript === id ? null : id);
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

  const handleCopyGlobalFeed = () => {
    const feedUrl = getGlobalFeedUrl();
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this podcast episode?')) return;
    try {
      await deleteEpisode(id);
      setEpisodes((prev) => prev.filter((ep) => ep.id !== id));
    } catch (err) {
      console.error('Failed to delete episode', err);
    }
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#fafafa] mb-2 tracking-tight">Podcast Library</h1>
          <p className="text-[#a3a3a3] text-base">Listen to, read, and manage your AI-synthesized news podcasts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyGlobalFeed}
            className="btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            title="Copy Apple Podcasts / RSS 2.0 feed link"
          >
            <Rss size={14} className="text-white" />
            {copiedFeed ? 'Copied RSS URL!' : 'Subscribe via RSS'}
          </button>
          <Link 
            to="/generator" 
            className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-2"
          >
            <Plus size={14} /> New Podcast
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : episodes.length === 0 ? (
        <div className="glass-panel p-16 text-center flex flex-col items-center rounded-3xl border border-white/[0.08]">
          <div className="w-16 h-16 bg-white/[0.05] rounded-full flex items-center justify-center text-white mb-5 border border-white/10">
            <Headphones size={28} />
          </div>
          <h3 className="text-xl font-bold text-[#fafafa] mb-2">No episodes generated yet</h3>
          <p className="text-[#a3a3a3] max-w-md mb-6 text-sm">
            Paste any news article or pick RSS stories to create your very first audio podcast.
          </p>
          <Link to="/generator" className="btn-primary text-xs font-semibold flex items-center gap-2">
            <Sparkles size={14} /> Open AI Studio
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

            const isCurrentPlaying = currentEpisode && currentEpisode.id === episode.id && isPlaying;
            const isLoadedInPlayer = currentEpisode && currentEpisode.id === episode.id;
            const isPendingOrRunning = episode.status === 'pending' || episode.status === 'script_generated';

            return (
              <div 
                key={episode.id} 
                className={`glass-panel overflow-hidden transition-colors rounded-3xl border ${
                  isLoadedInPlayer
                    ? 'border-white/[0.24] shadow-sm'
                    : 'border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  
                  {/* Artwork / Play Button Overlay */}
                  <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 bg-[#171717] rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden group">
                    {episode.status === 'completed' && episode.audio_url ? (
                      <button
                        type="button"
                        onClick={() => playEpisode(episode)}
                        className="w-12 h-12 rounded-full bg-white text-[#0a0a0a] hover:bg-[#e5e5e5] flex items-center justify-center shadow-sm transition-colors z-20 cursor-pointer"
                        title={isCurrentPlaying ? 'Pause' : 'Play this episode'}
                      >
                        {isCurrentPlaying ? (
                          <Pause size={20} className="fill-[#0a0a0a] text-[#0a0a0a]" />
                        ) : (
                          <Play size={20} className="fill-[#0a0a0a] text-[#0a0a0a] ml-0.5" />
                        )}
                      </button>
                    ) : (
                      <Headphones size={32} className="text-white z-10" />
                    )}
                    
                    {episode.status === 'completed' && (
                      <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#4ade80] rounded-full z-20" title="Completed"></div>
                    )}
                    {isPendingOrRunning && (
                      <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#fbbf24] rounded-full animate-pulse z-20" title="Processing"></div>
                    )}
                    {episode.status === 'failed' && (
                      <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#f87171] rounded-full z-20" title="Failed"></div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[#a3a3a3]">
                            {isCustomArticle ? 'Article Text' : 'RSS Feed'}
                          </span>
                          <span className="text-xs text-[#737373] flex items-center gap-1">
                            <Clock size={12} /> {formatDuration(episode.duration_seconds)} • {new Date(episode.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-[#fafafa] leading-snug tracking-tight">
                          {episode.title}
                        </h3>
                      </div>
                      
                      {/* Status Badges: Small colored dot plus neutral text */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Fact Check Badge */}
                        {episode.fact_check_status === 'passed' && (
                          <span className="px-2.5 py-0.5 bg-white/5 text-[#a3a3a3] text-xs font-medium rounded-full border border-white/10 flex items-center gap-1.5" title="All claims verified against source articles">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
                            <ShieldCheck size={12} className="text-white" /> Verified
                          </span>
                        )}

                        {episode.fact_check_status === 'flagged' && (
                          <button
                            type="button"
                            onClick={() => toggleFactCheck(episode.id)}
                            className="px-2.5 py-0.5 bg-white/5 text-[#a3a3a3] hover:text-white text-xs font-medium rounded-full border border-white/10 hover:border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Click to view flagged claims"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>
                            <ShieldAlert size={12} className="text-[#fbbf24]" />
                            Fact-Check: {parsedFlags.length} Flagged
                            {expandedFactCheck === episode.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                          </button>
                        )}

                        {/* Readiness Status */}
                        {episode.status === 'completed' && (
                          <span className="px-2.5 py-0.5 bg-white/5 text-[#a3a3a3] text-xs font-medium rounded-full border border-white/10 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span> Ready
                          </span>
                        )}
                        {isPendingOrRunning && (
                          <span className="px-2.5 py-0.5 bg-white/5 text-[#a3a3a3] text-xs font-medium rounded-full border border-white/10 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse"></span> Synthesizing...
                          </span>
                        )}
                        {episode.status === 'failed' && (
                          <span className="px-2.5 py-0.5 bg-white/5 text-[#a3a3a3] text-xs font-medium rounded-full border border-white/10 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]"></span> Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Stepper for Pending/Running Episodes (SSE Powered, Replaces Polling) */}
                    {isPendingOrRunning && (
                      <div className="pt-2">
                        <PipelineStepper 
                          episodeId={episode.id} 
                          onComplete={() => fetchEpisodes()} 
                          onFail={() => fetchEpisodes()} 
                        />
                      </div>
                    )}

                    {/* Quick Play Controls when Completed */}
                    {episode.status === 'completed' && episode.audio_url && (
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => playEpisode(episode)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                            isCurrentPlaying
                              ? 'bg-white text-[#0a0a0a]'
                              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                          }`}
                        >
                          {isCurrentPlaying ? <Pause size={14} /> : <Play size={14} />}
                          {isCurrentPlaying ? 'Pause Episode' : 'Play Episode'}
                        </button>
                        <button
                          type="button"
                          onClick={() => addToQueue(episode)}
                          className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-[#a3a3a3] hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Add to player queue"
                        >
                          <ListPlus size={14} /> Add to Queue
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="border-t border-white/[0.06] bg-[#0d0d0d] p-3 px-6 md:px-8 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Synchronized Transcript Toggle */}
                    <button 
                      type="button"
                      onClick={() => toggleTranscript(episode.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-1.5 rounded-lg border cursor-pointer ${
                        expandedTranscript === episode.id
                          ? 'bg-white text-[#0a0a0a] border-white font-semibold'
                          : 'bg-white/5 hover:bg-white/10 text-[#a3a3a3] hover:text-white border-white/10'
                      }`}
                    >
                      <FileText size={14} />
                      {expandedTranscript === episode.id ? 'Hide Transcript' : 'Synchronized Transcript'}
                      {expandedTranscript === episode.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>

                    {/* Show Notes */}
                    {episode.articles && episode.articles.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => toggleNotes(episode.id)}
                        className="flex items-center gap-1.5 text-xs text-[#a3a3a3] hover:text-white font-medium transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
                      >
                        <BookOpen size={14} />
                        {expandedNotes === episode.id ? 'Hide Sources' : `Show Notes (${episode.articles.length})`}
                        {expandedNotes === episode.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                    )}

                    {/* Copy Plain Script */}
                    {episode.script && (
                      <button
                        type="button"
                        onClick={() => handleCopyScript(episode.id, episode.script)}
                        className="flex items-center gap-1.5 text-xs text-[#737373] hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                        title="Copy script to clipboard"
                      >
                        {copiedId === episode.id ? (
                          <>
                            <Check size={12} className="text-white" />
                            <span className="text-white">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Script</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {episode.status === 'completed' && episode.audio_url && (
                      <a 
                        href={`${BASE_URL}${episode.audio_url}`}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#fafafa] hover:underline font-medium transition-colors"
                      >
                        <Download size={14} /> Download MP3
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(episode.id)}
                      className="text-[#737373] hover:text-[#f87171] transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                      title="Delete Episode"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Synchronized Live Highlighting Transcript Drawer */}
                {expandedTranscript === episode.id && (
                  <div className="p-6 md:p-8 bg-[#0a0a0a] border-t border-white/[0.08] animate-slide-up space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-white"/>
                        <h4 className="text-white font-bold text-sm">Synchronized Spoken Transcript</h4>
                      </div>
                      <span className="text-xs text-[#737373]">
                        Click any line to jump audio directly to that moment
                      </span>
                    </div>

                    <SynchronizedTranscript
                      episode={episode}
                      currentTime={isCurrentPlaying ? currentTime : 0}
                      onSeek={(seekSec) => {
                        if (!isCurrentPlaying) {
                          playEpisode(episode);
                        }
                        seek(seekSec);
                      }}
                    />
                  </div>
                )}

                {/* Show Notes & Sources Drawer */}
                {expandedNotes === episode.id && episode.articles && (
                  <div className="p-6 md:p-8 bg-[#0a0a0a] border-t border-white/[0.08] animate-slide-up space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-white"/>
                        <h4 className="text-white font-bold text-sm">Show Notes & Referenced Sources</h4>
                      </div>
                      <span className="text-xs text-[#737373]">
                        {episode.articles.length} verified news reference{episode.articles.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {episode.articles.map((art) => {
                        const isCustom = art.source === 'Custom Article Input' || art.url?.startsWith('custom://');
                        return (
                          <div 
                            key={art.id} 
                            className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-[#a3a3a3] border border-white/10 uppercase">
                                  {art.source}
                                </span>
                                {art.category && (
                                  <span className="text-[11px] text-[#737373]">
                                    • {art.category}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-xs font-semibold text-[#fafafa] line-clamp-2 leading-snug">
                                {art.title}
                              </h5>
                            </div>

                            {isCustom ? (
                              <span className="text-xs text-[#737373] italic">User-provided text input</span>
                            ) : (
                              <a
                                href={art.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-white hover:underline font-medium transition-colors"
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
                  <div className="p-6 md:p-8 bg-[#111111] border-t border-white/[0.08] animate-slide-up space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <ShieldAlert size={16} className="text-[#fbbf24]" />
                        <h4 className="font-bold text-sm">Fact-Check Review ({parsedFlags.length} Flagged Claims)</h4>
                      </div>
                      <span className="text-xs text-[#737373]">
                        Verified by Secondary LLM Validator
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {parsedFlags.map((flag, fIdx) => (
                        <div 
                          key={fIdx} 
                          className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-white text-xs">
                              Claim #{fIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/10 bg-white/5 ${
                                flag.severity === 'high' ? 'text-[#f87171]' : 'text-[#fbbf24]'
                              }`}>
                                Severity: {flag.severity || 'medium'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-[#a3a3a3] uppercase border border-white/10">
                                {flag.status || 'unsupported'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/5 text-[#fafafa] italic">
                            "{flag.claim}"
                          </div>

                          <div className="text-[#a3a3a3]">
                            <span className="text-white font-medium">Issue: </span>
                            {flag.reason}
                          </div>
                        </div>
                      ))}
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
