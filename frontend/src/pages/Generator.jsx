import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Settings2, 
  Hash, 
  Wand2, 
  ArrowRight, 
  FileText, 
  Volume2, 
  RotateCcw, 
  BookOpen, 
  Check,
  Newspaper,
  Sliders,
  Users,
  User,
  Music
} from 'lucide-react';
import { generateEpisode, getVoices, getNewsSources, getHostPairs } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SAMPLE_ARTICLES = [
  {
    title: "India Advances AI & Quantum Mission: Major Milestone Reached",
    content: `The Department of Science and Technology in New Delhi announced a major leap in India's National Quantum Mission today. A collaborative consortium of top IITs and scientific institutions demonstrated a 50-qubit superconducting quantum processor capable of executing complex simulation algorithms at room-temperature interface.\n\nThe breakthrough places India among a select group of nations with indigenous quantum hardware architectures. Concurrently, the IndiaAI Mission announced new GPU compute allocation grants to over 100 deep-tech startups working on generative AI models tailored for Indian regional languages.`
  },
  {
    title: "ISRO Lunar & Deep Space Exploration: Next Phase Announced",
    content: `The Indian Space Research Organisation (ISRO) officially outlined details for the upcoming Chandrayaan-4 sample return mission and the Shukrayaan Venus orbiter during a press conference in Bengaluru.\n\nBuilding on the historic soft-landing success at the Moon's South Pole, Chandrayaan-4 will feature a modular robotic docking mechanism to collect soil core samples and launch them back to Earth. ISRO Chairman highlighted that international space agencies have requested data sharing agreements for the mission's findings.`
  }
];

const DEFAULT_SOURCES = [
  {
    id: "the_hindu",
    name: "The Hindu",
    region: "India",
    logo_text: "TH",
    description: "India's premier national newspaper delivering authoritative reporting.",
    categories: [
      { id: "national", name: "National (India)" },
      { id: "business", name: "Business & Economy" },
      { id: "technology", name: "Tech & Sci-Tech" },
      { id: "science", name: "Science & Environment" },
      { id: "international", name: "World News" }
    ]
  },
  {
    id: "ndtv",
    name: "NDTV",
    region: "India",
    logo_text: "NDTV",
    description: "Leading Indian network covering breaking national & business updates.",
    categories: [
      { id: "top_stories", name: "Top Headlines" },
      { id: "india", name: "India News" },
      { id: "technology", name: "Gadgets 360 (Tech)" },
      { id: "business", name: "NDTV Profit (Business)" },
      { id: "sports", name: "Sports" }
    ]
  },
  {
    id: "times_of_india",
    name: "Times of India",
    region: "India",
    logo_text: "TOI",
    description: "India's highest circulation English daily covering breaking stories.",
    categories: [
      { id: "top_stories", name: "Top Stories" },
      { id: "india", name: "India Headlines" },
      { id: "business", name: "Business" },
      { id: "technology", name: "Technology" },
      { id: "world", name: "World" }
    ]
  },
  {
    id: "indian_express",
    name: "The Indian Express",
    region: "India",
    logo_text: "IE",
    description: "Investigative journalism and in-depth reporting across India.",
    categories: [
      { id: "india", name: "National News" },
      { id: "business", name: "Business & Markets" },
      { id: "technology", name: "Technology & AI" },
      { id: "world", name: "World Affairs" }
    ]
  },
  {
    id: "economic_times",
    name: "The Economic Times",
    region: "India",
    logo_text: "ET",
    description: "India's #1 financial newspaper for markets, startups, and economy.",
    categories: [
      { id: "top_stories", name: "Top Financial Stories" },
      { id: "markets", name: "Stock Markets & Sensex" },
      { id: "technology", name: "Tech & Startups" },
      { id: "industry", name: "Industry & Economy" }
    ]
  },
  {
    id: "bbc",
    name: "BBC News",
    region: "Global",
    logo_text: "BBC",
    description: "British Broadcasting Corporation delivering global international headlines.",
    categories: [
      { id: "world", name: "Global News" },
      { id: "technology", name: "Tech & Science" },
      { id: "business", name: "World Business" }
    ]
  }
];

const Generator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'text' ? 'text' : 'channel';

  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [selectedSourceId, setSelectedSourceId] = useState("the_hindu");
  const [selectedCategoryId, setSelectedCategoryId] = useState("national");
  const [voices, setVoices] = useState([]);
  const [hostPairs, setHostPairs] = useState([]);
  const [selectedPairId, setSelectedPairId] = useState("neerja_prabhat");
  const [format, setFormat] = useState("monologue"); // monologue or dialogue
  const [includeMusic, setIncludeMusic] = useState(true);

  // Mode: 'channel' (RSS feeds) or 'text' (Direct article paste)
  const [mode, setMode] = useState(initialMode);

  const [formData, setFormData] = useState({
    title: '',
    source_mode: initialMode,
    source_id: 'the_hindu',
    category: 'national',
    num_stories: 4,
    article_text: '',
    voice: 'en-IN-NeerjaNeural',
    voice_a: 'en-IN-NeerjaNeural',
    voice_b: 'en-IN-PrabhatNeural',
    format: 'monologue',
    include_music: true,
    tone: 'professional',
    host_style: 'standard'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch live news sources catalog
    getNewsSources()
      .then(res => {
        if (res.data && res.data.length > 0) {
          setSources(res.data);
          const first = res.data[0];
          setSelectedSourceId(first.id);
          if (first.categories && first.categories.length > 0) {
            setSelectedCategoryId(first.categories[0].id);
            setFormData(prev => ({
              ...prev,
              source_id: first.id,
              category: first.categories[0].id,
              title: `${first.name} - ${first.categories[0].name} News Briefing`
            }));
          }
        }
      })
      .catch(err => console.error("Failed to fetch sources catalog", err));

    // Fetch voice list
    getVoices()
      .then(res => setVoices(res.data))
      .catch(err => console.error("Failed to fetch voices", err));

    // Fetch host pairs
    getHostPairs()
      .then(res => {
        if (res.data && res.data.length > 0) {
          setHostPairs(res.data);
          setSelectedPairId(res.data[0].id);
        }
      })
      .catch(err => console.error("Failed to fetch host pairs", err));
  }, []);

  // Update title when source or category changes
  const activeSource = sources.find(s => s.id === selectedSourceId) || sources[0];

  const handleSourceChange = (srcId) => {
    setSelectedSourceId(srcId);
    const src = sources.find(s => s.id === srcId);
    if (src && src.categories && src.categories.length > 0) {
      const defaultCat = src.categories[0].id;
      setSelectedCategoryId(defaultCat);
      setFormData(prev => ({
        ...prev,
        source_id: srcId,
        category: defaultCat,
        title: `${src.name} - ${src.categories[0].name} News Briefing`
      }));
    }
  };

  const handleCategoryChange = (catId) => {
    setSelectedCategoryId(catId);
    const cat = activeSource?.categories?.find(c => c.id === catId);
    setFormData(prev => ({
      ...prev,
      category: catId,
      title: `${activeSource?.name || 'News'} - ${cat?.name || 'Top Stories'} Briefing`
    }));
  };

  const handleLoadSample = (sample) => {
    setFormData(prev => ({
      ...prev,
      title: sample.title,
      article_text: sample.content
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        title: formData.title || (mode === 'text' ? 'Custom News Podcast' : `${activeSource.name} News Briefing`),
        source_mode: mode,
        source_id: mode === 'channel' ? selectedSourceId : null,
        category: mode === 'channel' ? selectedCategoryId : null,
        num_stories: mode === 'channel' ? formData.num_stories : null,
        article_text: mode === 'text' ? formData.article_text : null,
        format: format,
        include_music: includeMusic,
        voice: format === 'monologue' ? formData.voice : null,
        voice_a: format === 'dialogue' ? hostPairs.find(p => p.id === selectedPairId)?.voice_a : null,
        voice_b: format === 'dialogue' ? hostPairs.find(p => p.id === selectedPairId)?.voice_b : null,
        tone: formData.tone,
        host_style: formData.host_style
      };

      await generateEpisode(payload);
      navigate(`/history`);
    } catch (error) {
      console.error("Failed to generate episode", error);
      alert(`Generation failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tones = [
    { id: 'professional', label: 'Professional', desc: 'Authoritative, calm, objective broadcast journalism' },
    { id: 'casual', label: 'Casual', desc: 'Warm, conversational, easy-listening news delivery' },
    { id: 'dramatic', label: 'Dramatic', desc: 'Fast-paced, suspenseful, urgent breaking news style' },
    { id: 'humorous', label: 'Witty', desc: 'Clever, lighthearted, entertaining commentary' }
  ];

  const styles = [
    { id: 'standard', label: 'Straight News', desc: 'Direct, factual, chronological summary' },
    { id: 'deep_dive', label: 'Deep Dive', desc: 'Analytical breakdown with contextual background' },
    { id: 'roundtable', label: 'Roundtable', desc: 'Multi-perspective briefing and panel overview' }
  ];

  const wordCount = formData.article_text.trim() ? formData.article_text.trim().split(/\s+/).length : 0;
  const estimatedReadTimeMinutes = Math.max(1, Math.round(wordCount / 140));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <header className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3.5 bg-white text-[#0a0a0a] rounded-2xl shadow-sm mb-2">
          <Wand2 size={28} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#fafafa] tracking-tight">AI Podcast Studio</h1>
        <p className="text-[#a3a3a3] text-base max-w-xl mx-auto">
          Auto-fetch top Indian & Global news outlets or paste your own articles to produce voice-narrated podcasts.
        </p>
      </header>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="glass-panel p-1.5 rounded-2xl inline-flex gap-1.5 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setMode('channel');
              setFormData(prev => ({ ...prev, source_mode: 'channel' }));
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
              mode === 'channel'
                ? 'bg-white text-[#0a0a0a] shadow-sm'
                : 'text-[#a3a3a3] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Newspaper size={16} />
            Live News Outlets
          </button>
          
          <button
            type="button"
            onClick={() => {
              setMode('text');
              setFormData(prev => ({ ...prev, source_mode: 'text' }));
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
              mode === 'text'
                ? 'bg-white text-[#0a0a0a] shadow-sm'
                : 'text-[#a3a3a3] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FileText size={16} />
            Custom Article Text
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-8 md:p-10 space-y-10 border border-white/[0.08] rounded-3xl">
        
        {/* Title Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
            <Settings2 size={14} className="text-white"/> Episode Title
          </label>
          <input 
            type="text" 
            className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-[#fafafa] placeholder-[#737373] focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors font-medium text-sm"
            placeholder="e.g. The Hindu - National News Briefing"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
        </div>

        {/* Mode 1: Live News Outlets & Category Picker */}
        {mode === 'channel' && (
          <div className="space-y-8 animate-fade-in">
            {/* News Outlet Selection */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                  <Newspaper size={14} className="text-white"/> 1. Choose News Media Outlet
                </label>
                <span className="text-xs text-[#737373]">Live Real-time Feeds</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sources.map(src => {
                  const isSelected = selectedSourceId === src.id;
                  return (
                    <button
                      type="button"
                      key={src.id}
                      onClick={() => handleSourceChange(src.id)}
                      className={`p-4 rounded-2xl border text-left transition-colors relative cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.06] border-white shadow-sm'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-[#fafafa] text-sm tracking-tight">{src.name}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[#a3a3a3]">
                          {src.region === 'India' ? 'India' : 'Global'}
                        </span>
                      </div>
                      <p className="text-xs text-[#737373] line-clamp-2 leading-relaxed">{src.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selection for chosen outlet */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                <Sliders size={14} className="text-white"/> 2. Select Category for {activeSource?.name}
              </label>
              <div className="flex flex-wrap gap-2">
                {activeSource?.categories.map(cat => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#0a0a0a] font-semibold border-white shadow-sm'
                          : 'bg-white/[0.03] border-white/10 text-[#a3a3a3] hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stories Slider */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                <Hash size={14} className="text-white"/> 3. Number of Stories to Cover
              </label>
              <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
                <input 
                  type="range" 
                  min="2" max="8" 
                  className="w-full accent-white cursor-pointer"
                  value={formData.num_stories}
                  onChange={(e) => setFormData({...formData, num_stories: parseInt(e.target.value)})}
                />
                <span className="text-xs font-bold text-white bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-xl min-w-[5rem] text-center">
                  {formData.num_stories} stories
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Direct News Article Text Area */}
        {mode === 'text' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-white"/> News Article Content
                </label>
                <p className="text-xs text-[#737373] mt-0.5">
                  Paste the full text of any breaking news story or editorial.
                </p>
              </div>

              {/* Sample loader buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#737373] font-medium">Try Indian Sample:</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_ARTICLES[0])}
                  className="px-2.5 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 text-[#a3a3a3] hover:text-white border border-white/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen size={12} /> Quantum Mission
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_ARTICLES[1])}
                  className="px-2.5 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 text-[#a3a3a3] hover:text-white border border-white/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen size={12} /> ISRO Space
                </button>
                {formData.article_text && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, article_text: '' }))}
                    className="p-1 text-xs text-[#737373] hover:text-white transition-colors cursor-pointer"
                    title="Clear text"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea 
                rows={8}
                className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 text-[#fafafa] placeholder-[#737373] focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors font-mono text-xs leading-relaxed"
                placeholder="Paste news story, breaking press release, research paper summary, or editorial here..."
                value={formData.article_text}
                onChange={(e) => setFormData({...formData, article_text: e.target.value})}
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[11px] text-[#737373] bg-[#171717] px-3 py-1 rounded-lg border border-white/10">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>~{estimatedReadTimeMinutes} min podcast</span>
              </div>
            </div>
          </div>
        )}

        {/* Podcast Format Selector (Monologue vs Dialogue) */}
        <div className="space-y-3 pt-6 border-t border-white/10">
          <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sliders size={14} className="text-white"/> Podcast Format
            </span>
            <span className="text-xs text-[#737373] normal-case">Solo host briefing or dual-host discussion</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormat('monologue')}
              className={`p-4 rounded-2xl border text-left transition-colors relative flex items-start gap-3.5 cursor-pointer ${
                format === 'monologue'
                  ? 'bg-white/[0.06] border-white shadow-sm'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${format === 'monologue' ? 'bg-white text-[#0a0a0a]' : 'bg-white/5 text-[#737373]'}`}>
                <User size={18} />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  Monologue
                  {format === 'monologue' && (
                    <span className="text-[10px] bg-white text-[#0a0a0a] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Active</span>
                  )}
                </div>
                <p className="text-xs text-[#737373] leading-relaxed">
                  Solo news anchor delivering a structured, continuous news briefing.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('dialogue')}
              className={`p-4 rounded-2xl border text-left transition-colors relative flex items-start gap-3.5 cursor-pointer ${
                format === 'dialogue'
                  ? 'bg-white/[0.06] border-white shadow-sm'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${format === 'dialogue' ? 'bg-white text-[#0a0a0a]' : 'bg-white/5 text-[#737373]'}`}>
                <Users size={18} />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  Dialogue (Dual Host)
                  {format === 'dialogue' && (
                    <span className="text-[10px] bg-white text-[#0a0a0a] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Active</span>
                  )}
                </div>
                <p className="text-xs text-[#737373] leading-relaxed">
                  Two co-hosts discussing stories with natural back-and-forth banter, pauses, and music.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Voice Selection (TTS) */}
        {format === 'dialogue' ? (
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-white"/> Host Pair (Lead Anchor & Co-Host)
              </label>
              
              {/* Optional Music Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-[#a3a3a3] transition-colors">
                <input
                  type="checkbox"
                  checked={includeMusic}
                  onChange={(e) => setIncludeMusic(e.target.checked)}
                  className="rounded border-white/20 text-white focus:ring-white"
                />
                <Music size={14} className="text-white" />
                <span>Intro / Outro Music Branding</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {hostPairs.map(pair => {
                const isSelected = selectedPairId === pair.id;
                const isIndian = pair.locale === 'en-IN';
                return (
                  <button
                    type="button"
                    key={pair.id}
                    onClick={() => setSelectedPairId(pair.id)}
                    className={`p-4 rounded-2xl border text-left transition-colors relative cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.06] border-white shadow-sm'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-white text-sm flex items-center gap-2">
                        {pair.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[#a3a3a3]">
                          {isIndian ? 'India ' + pair.locale : pair.locale}
                        </span>
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-white text-[#0a0a0a] flex items-center justify-center">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#a3a3a3] mb-2">{pair.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#737373] pt-2 border-t border-white/5">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#a3a3a3] font-medium">
                        Host A: {pair.voice_a_name}
                      </span>
                      <span>+</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#a3a3a3] font-medium">
                        Host B: {pair.voice_b_name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-6 border-t border-white/10">
            <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
              <Volume2 size={14} className="text-white"/> Narrator Voice (Edge-TTS Neural Speech)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(voices.length > 0 ? voices : [
                { id: 'en-IN-NeerjaNeural', name: 'Neerja', gender: 'Female', locale: 'en-IN', description: 'Expressive Indian English' },
                { id: 'en-IN-PrabhatNeural', name: 'Prabhat', gender: 'Male', locale: 'en-IN', description: 'Authoritative Indian News Presenter' },
                { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'Male', locale: 'en-US', description: 'Deep & Authoritative' },
                { id: 'en-US-AriaNeural', name: 'Aria', gender: 'Female', locale: 'en-US', description: 'Crisp & Expressive' }
              ]).map(v => {
                const isSelected = formData.voice === v.id;
                const isIndian = v.locale === 'en-IN';
                return (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setFormData({...formData, voice: v.id})}
                    className={`p-3.5 rounded-2xl border text-left transition-colors relative cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.06] border-white shadow-sm'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        {v.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[#a3a3a3]">
                          {isIndian ? 'India ' + v.locale : v.locale}
                        </span>
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-white text-[#0a0a0a] flex items-center justify-center">
                          <Check size={10} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#737373] line-clamp-2">{v.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tone & Host Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/10">
          {/* Tone */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider">Podcast Tone</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tones.map(t => {
                const isSelected = formData.tone === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setFormData({...formData, tone: t.id})}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-white/[0.08] border-white text-white font-semibold shadow-sm' 
                        : 'bg-white/[0.02] border-white/10 text-[#737373] hover:bg-white/[0.04] hover:text-[#a3a3a3]'
                    }`}
                  >
                    <div className="font-semibold text-xs capitalize text-white">{t.label}</div>
                    <div className="text-[11px] text-[#737373] mt-0.5 leading-tight">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host Style */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider">Host Style</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {styles.map(s => {
                const isSelected = formData.host_style === s.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setFormData({...formData, host_style: s.id})}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-white/[0.08] border-white text-white font-semibold shadow-sm' 
                        : 'bg-white/[0.02] border-white/10 text-[#737373] hover:bg-white/[0.04] hover:text-[#a3a3a3]'
                    }`}
                  >
                    <div className="font-semibold text-xs capitalize text-white">{s.label}</div>
                    <div className="text-[11px] text-[#737373] mt-0.5 leading-tight">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-6">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary py-4 text-sm font-bold rounded-2xl flex items-center justify-center gap-3 transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Fetching Live News, Generating with Groq & Synthesizing Audio...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Fetch News & Generate Podcast Episode</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Generator;
