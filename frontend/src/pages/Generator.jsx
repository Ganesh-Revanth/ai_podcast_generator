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
  Sliders
} from 'lucide-react';
import { generateEpisode, getVoices, getNewsSources, BASE_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';

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
    description: "World-renowned international public broadcaster.",
    categories: [
      { id: "world", name: "World Headlines" },
      { id: "technology", name: "Technology" },
      { id: "business", name: "Business" },
      { id: "science", name: "Science & Climate" }
    ]
  }
];

const Generator = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('channel'); // 'channel' or 'text'
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [voices, setVoices] = useState([]);
  
  const [selectedSourceId, setSelectedSourceId] = useState('the_hindu');
  const [selectedCategoryId, setSelectedCategoryId] = useState('national');

  const [formData, setFormData] = useState({
    title: 'The Hindu - National News Briefing',
    source_mode: 'channel',
    source_id: 'the_hindu',
    category: 'national',
    article_text: '',
    voice: 'en-IN-NeerjaNeural',
    num_stories: 5,
    tone: 'professional',
    host_style: 'informative'
  });

  const tones = [
    { id: 'professional', label: 'Professional', desc: 'Formal, balanced, authoritative' },
    { id: 'casual', label: 'Casual', desc: 'Relaxed, friendly, everyday conversational' },
    { id: 'energetic', label: 'Energetic', desc: 'Upbeat, exciting, fast-paced' },
    { id: 'humorous', label: 'Humorous', desc: 'Witty, entertaining with light humor' },
    { id: 'dramatic', label: 'Dramatic', desc: 'Suspenseful, intense, story-driven' }
  ];

  const styles = [
    { id: 'informative', label: 'Informative Host', desc: 'Clear news anchor presenting key insights' },
    { id: 'storyteller', label: 'Storyteller', desc: 'Narrative arc with immersive context' },
    { id: 'analytical', label: 'Deep Analyst', desc: 'Explains underlying causes & future impact' },
    { id: 'conversational', label: 'Coffee Chat', desc: 'Natural dialogue-style news briefing' }
  ];

  useEffect(() => {
    // Load News Outlets
    const loadSources = async () => {
      try {
        const res = await getNewsSources();
        if (res.data && res.data.length > 0) {
          setSources(res.data);
        }
      } catch (err) {
        console.warn('Using default sources catalog', err);
      }
    };

    // Load Voices
    const loadVoices = async () => {
      try {
        const res = await getVoices();
        if (res.data && res.data.length > 0) {
          setVoices(res.data);
          // Default to first voice (e.g. Neerja Indian Voice)
          setFormData(prev => ({ ...prev, voice: res.data[0].id }));
        }
      } catch (err) {
        console.warn('Using default voices fallback', err);
      }
    };

    loadSources();
    loadVoices();
  }, []);

  const activeSource = sources.find(s => s.id === selectedSourceId) || sources[0];

  const handleSourceChange = (srcId) => {
    setSelectedSourceId(srcId);
    const src = sources.find(s => s.id === srcId);
    const defaultCat = src && src.categories.length > 0 ? src.categories[0].id : 'top_stories';
    setSelectedCategoryId(defaultCat);
    
    const catName = src && src.categories.length > 0 ? src.categories[0].name : 'News';
    const newTitle = `${src ? src.name : 'News'} - ${catName} Briefing`;

    setFormData(prev => ({
      ...prev,
      source_id: srcId,
      category: defaultCat,
      title: newTitle
    }));
  };

  const handleCategoryChange = (catId) => {
    setSelectedCategoryId(catId);
    const catObj = activeSource?.categories.find(c => c.id === catId);
    const catName = catObj ? catObj.name : 'News';
    const newTitle = `${activeSource?.name || 'News'} - ${catName} Briefing`;

    setFormData(prev => ({
      ...prev,
      category: catId,
      title: newTitle
    }));
  };

  const handleLoadSample = (sample) => {
    setFormData(prev => ({
      ...prev,
      title: sample.title,
      article_text: sample.content
    }));
  };

  const wordCount = formData.article_text.trim() ? formData.article_text.trim().split(/\s+/).length : 0;
  const estimatedReadTimeMinutes = Math.max(1, Math.round(wordCount / 140));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'text' && !formData.article_text.trim()) {
      alert('Please paste or enter some news article text to generate your podcast.');
      return;
    }

    setLoading(true);
    try {
      await generateEpisode({
        ...formData,
        source_mode: mode,
        source_id: selectedSourceId,
        category: selectedCategoryId,
        title: formData.title.trim() || `${activeSource?.name} Podcast Briefing`
      });
      // Navigate to library where user can listen to the audio
      navigate('/history');
    } catch (error) {
      console.error('Failed to generate episode', error);
      alert(`Generation failed. Make sure the backend server is running on ${BASE_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <header className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-primary/30 to-accent/30 text-primary border border-primary/20 rounded-2xl shadow-lg shadow-primary/10 mb-2">
          <Wand2 size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">AI Podcast Studio</h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Auto-fetch top Indian & Global news outlets or paste your own articles to produce voice-narrated podcasts.
        </p>
      </header>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="glass-panel p-1.5 rounded-2xl inline-flex gap-2 border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('channel');
              setFormData(prev => ({ ...prev, source_mode: 'channel' }));
            }}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
              mode === 'channel'
                ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Newspaper size={18} />
            Live News Outlets (The Hindu, NDTV, TOI...)
          </button>
          
          <button
            type="button"
            onClick={() => {
              setMode('text');
              setFormData(prev => ({ ...prev, source_mode: 'text' }));
            }}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
              mode === 'text'
                ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={18} />
            Paste Custom Article Text
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-8 md:p-10 space-y-10 border border-white/10 rounded-3xl">
        
        {/* Title Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Settings2 size={16} className="text-primary"/> Episode Title
          </label>
          <input 
            type="text" 
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
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
                <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Newspaper size={16} className="text-primary"/> 1. Choose News Media Outlet
                </label>
                <span className="text-xs text-gray-400">Live Real-time Feeds</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sources.map(src => {
                  const isSelected = selectedSourceId === src.id;
                  return (
                    <button
                      type="button"
                      key={src.id}
                      onClick={() => handleSourceChange(src.id)}
                      className={`p-4 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-extrabold text-white text-base tracking-tight">{src.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          src.region === 'India' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {src.region === 'India' ? '🇮🇳 India' : '🌍 Global'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{src.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selection for chosen outlet */}
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Sliders size={16} className="text-primary"/> 2. Select Category for {activeSource?.name}
              </label>
              <div className="flex flex-wrap gap-2.5">
                {activeSource?.categories.map(cat => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border-primary font-semibold'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
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
              <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Hash size={16} className="text-primary"/> 3. Number of Stories to Cover
              </label>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <input 
                  type="range" 
                  min="2" max="8" 
                  className="w-full accent-primary cursor-pointer"
                  value={formData.num_stories}
                  onChange={(e) => setFormData({...formData, num_stories: parseInt(e.target.value)})}
                />
                <span className="text-lg font-bold text-white bg-primary/20 border border-primary/30 px-4 py-1.5 rounded-xl min-w-[3rem] text-center">
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
                <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <FileText size={16} className="text-primary"/> News Article Content
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Paste the full text of any breaking news story or editorial.
                </p>
              </div>

              {/* Sample loader buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">Try Indian Sample:</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_ARTICLES[0])}
                  className="px-2.5 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg transition-colors flex items-center gap-1"
                >
                  <BookOpen size={12} /> Quantum Mission
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_ARTICLES[1])}
                  className="px-2.5 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg transition-colors flex items-center gap-1"
                >
                  <BookOpen size={12} /> ISRO Space
                </button>
                {formData.article_text && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, article_text: '' }))}
                    className="p-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
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
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm leading-relaxed"
                placeholder="Paste news story, breaking press release, research paper summary, or editorial here..."
                value={formData.article_text}
                onChange={(e) => setFormData({...formData, article_text: e.target.value})}
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-4 text-xs text-gray-400 bg-black/40 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>~{estimatedReadTimeMinutes} min podcast</span>
              </div>
            </div>
          </div>
        )}

        {/* Voice Selection (TTS) with Indian & Global Voices */}
        <div className="space-y-3 pt-6 border-t border-white/10">
          <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Volume2 size={16} className="text-primary"/> Narrator Voice (Edge-TTS Neural Speech)
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
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      {v.name}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                        isIndian ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-white/10 text-gray-300'
                      }`}>
                        {isIndian ? '🇮🇳 ' + v.locale : v.locale}
                      </span>
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{v.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone & Host Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/10">
          {/* Tone */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300">Podcast Tone</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tones.map(t => {
                const isSelected = formData.tone === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setFormData({...formData, tone: t.id})}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'bg-accent/20 border-accent text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                    }`}
                  >
                    <div className="font-semibold text-sm capitalize text-white">{t.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host Style */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300">Host Style</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {styles.map(s => {
                const isSelected = formData.host_style === s.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setFormData({...formData, host_style: s.id})}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                    }`}
                  >
                    <div className="font-semibold text-sm capitalize text-white">{s.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{s.desc}</div>
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
            className="w-full btn-primary py-4 text-lg font-bold shadow-xl shadow-primary/25 rounded-2xl flex items-center justify-center gap-3 transition-transform duration-300 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Fetching Live News, Generating with Groq & Synthesizing Audio...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Fetch News & Generate Podcast Episode</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Generator;


