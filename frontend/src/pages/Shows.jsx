import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Plus, 
  Play, 
  Clock, 
  Settings, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  User, 
  X,
  Rss,
  Check
} from 'lucide-react';
import { 
  getShows, 
  createShow, 
  updateShow, 
  deleteShow, 
  toggleShow, 
  runShow, 
  getNewsSources, 
  getVoices, 
  getHostPairs,
  getShowFeedUrl
} from '../services/api';

const SCHEDULE_PRESETS = [
  { label: 'Daily at 08:00 AM UTC (Morning)', value: 'daily:08:00' },
  { label: 'Daily at 12:00 PM UTC (Noon)', value: 'daily:12:00' },
  { label: 'Daily at 06:00 PM UTC (Evening)', value: 'daily:18:00' },
  { label: 'Every Hour', value: 'hourly' },
  { label: 'Every 6 Hours', value: 'every_6_hours' },
  { label: 'Custom Cron Expression', value: 'custom' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional & Authoritative' },
  { value: 'casual', label: 'Casual & Conversational' },
  { value: 'dramatic', label: 'Dramatic & Engaging' },
  { value: 'humorous', label: 'Witty & Entertaining' },
  { value: 'investigative', label: 'Investigative & Deep Dive' },
];

const Shows = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Catalogs
  const [sources, setSources] = useState([]);
  const [voices, setVoices] = useState([]);
  const [hostPairs, setHostPairs] = useState([]);

  // Running action indicator
  const [runningShowId, setRunningShowId] = useState(null);
  const [copiedShowId, setCopiedShowId] = useState(null);

  const handleCopyFeed = (showId) => {
    const url = getShowFeedUrl(showId);
    navigator.clipboard.writeText(url);
    setCopiedShowId(showId);
    showNotification('Show RSS Feed URL copied to clipboard! Ready to paste into any podcast app.');
    setTimeout(() => setCopiedShowId(null), 2500);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [customScheduleInput, setCustomScheduleInput] = useState('0 8 * * *');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source_id: 'the_hindu',
    category: 'national',
    topics: '',
    tone: 'professional',
    format: 'monologue',
    voice: 'en-IN-NeerjaNeural',
    voice_a: 'en-IN-NeerjaNeural',
    voice_b: 'en-IN-PrabhatNeural',
    target_minutes: 5,
    schedule: 'daily:08:00',
    enabled: true,
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [showsRes, sourcesRes, voicesRes, pairsRes] = await Promise.all([
        getShows(),
        getNewsSources(),
        getVoices(),
        getHostPairs()
      ]);
      setShows(showsRes.data || []);
      setSources(sourcesRes.data || []);
      setVoices(voicesRes.data || []);
      setHostPairs(pairsRes.data || []);
    } catch (err) {
      console.error('Failed to load shows data', err);
      setError('Failed to fetch shows and configuration options.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingShow(null);
    setIsCustomSchedule(false);
    setFormData({
      name: '',
      description: '',
      source_id: sources[0]?.id || 'the_hindu',
      category: sources[0]?.categories?.[0]?.id || 'national',
      topics: '',
      tone: 'professional',
      format: 'monologue',
      voice: voices[0]?.id || 'en-IN-NeerjaNeural',
      voice_a: hostPairs[0]?.voice_a || 'en-IN-NeerjaNeural',
      voice_b: hostPairs[0]?.voice_b || 'en-IN-PrabhatNeural',
      target_minutes: 5,
      schedule: 'daily:08:00',
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (show) => {
    setEditingShow(show);
    const isCustom = !SCHEDULE_PRESETS.some(p => p.value === show.schedule);
    setIsCustomSchedule(isCustom);
    if (isCustom) setCustomScheduleInput(show.schedule);

    setFormData({
      name: show.name,
      description: show.description || '',
      source_id: show.source_id,
      category: show.category,
      topics: show.topics || '',
      tone: show.tone || 'professional',
      format: show.format || 'monologue',
      voice: show.voice || 'en-IN-NeerjaNeural',
      voice_a: show.voice_a || 'en-IN-NeerjaNeural',
      voice_b: show.voice_b || 'en-IN-PrabhatNeural',
      target_minutes: show.target_minutes || 5,
      schedule: show.schedule || 'daily:08:00',
      enabled: show.enabled ?? true,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShow(null);
  };

  const handleSaveShow = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        schedule: isCustomSchedule ? customScheduleInput : formData.schedule,
        target_minutes: parseInt(formData.target_minutes, 10),
      };

      if (editingShow) {
        await updateShow(editingShow.id, payload);
        showNotification(`Show "${payload.name}" updated successfully.`);
      } else {
        await createShow(payload);
        showNotification(`Show "${payload.name}" created and scheduled.`);
      }
      handleCloseModal();
      loadAll();
    } catch (err) {
      console.error('Failed to save show', err);
      alert(err.response?.data?.detail || 'Failed to save show configuration.');
    }
  };

  const handleToggle = async (showId, showName) => {
    try {
      const res = await toggleShow(showId);
      const stateStr = res.data?.enabled ? 'enabled' : 'paused';
      showNotification(`Show "${showName}" is now ${stateStr}.`);
      setShows(prev => prev.map(s => s.id === showId ? { ...s, enabled: res.data.enabled } : s));
    } catch (err) {
      console.error('Failed to toggle show', err);
      alert('Failed to change show status.');
    }
  };

  const handleRunNow = async (showId, showName) => {
    try {
      setRunningShowId(showId);
      showNotification(`Generating scheduled episode for "${showName}"...`);
      await runShow(showId);
      showNotification(`Episode for "${showName}" generated successfully! Check the History tab.`);
      loadAll();
    } catch (err) {
      console.error('Failed to run show', err);
      alert(err.response?.data?.detail || 'Failed to trigger episode generation.');
    } finally {
      setRunningShowId(null);
    }
  };

  const handleDelete = async (showId, showName) => {
    if (!window.confirm(`Are you sure you want to delete the show "${showName}"? This will remove its schedule.`)) {
      return;
    }
    try {
      await deleteShow(showId);
      showNotification(`Show "${showName}" was deleted.`);
      setShows(prev => prev.filter(s => s.id !== showId));
    } catch (err) {
      console.error('Failed to delete show', err);
      alert('Failed to delete show.');
    }
  };

  const activeSourceObj = sources.find(s => s.id === formData.source_id);
  const availableCategories = activeSourceObj?.categories || [
    { id: 'national', name: 'National' },
    { id: 'business', name: 'Business' },
    { id: 'technology', name: 'Technology' },
    { id: 'science', name: 'Science' },
  ];

  const handleSelectHostPair = (pairId) => {
    const pair = hostPairs.find(p => p.id === pairId);
    if (pair) {
      setFormData(prev => ({
        ...prev,
        voice_a: pair.voice_a,
        voice_b: pair.voice_b,
      }));
    }
  };

  const formatScheduleLabel = (sched) => {
    if (!sched) return 'Daily';
    if (sched === 'daily:08:00') return 'Daily at 08:00 AM UTC';
    if (sched === 'daily:12:00') return 'Daily at 12:00 PM UTC';
    if (sched === 'daily:18:00') return 'Daily at 06:00 PM UTC';
    if (sched === 'hourly') return 'Every Hour';
    if (sched.startsWith('every_') && sched.endsWith('_hours')) {
      const h = sched.replace('every_', '').replace('_hours', '');
      return `Every ${h} Hours`;
    }
    if (sched.startsWith('daily:')) {
      const time = sched.replace('daily:', '');
      return `Daily at ${time} UTC`;
    }
    return `Cron: ${sched}`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white text-[#0a0a0a] flex items-center justify-center shadow-sm">
              <Radio size={20} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#fafafa] tracking-tight">Recurring Shows</h1>
          </div>
          <p className="text-[#a3a3a3] text-base">
            Create scheduled podcast programs that automatically generate fresh episodes from your chosen sources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={loadAll}
            className="btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            title="Refresh Shows"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <button 
            type="button"
            onClick={handleOpenCreate}
            className="btn-primary py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            Create Show
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white animate-fade-in text-xs font-medium">
          <CheckCircle2 size={16} className="text-[#4ade80]" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white animate-fade-in text-xs font-medium">
          <AlertCircle size={16} className="text-[#f87171]" />
          <span>{error}</span>
        </div>
      )}

      {/* Shows Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel p-6 rounded-2xl animate-pulse space-y-4">
              <div className="h-5 bg-white/10 rounded w-3/4"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
              <div className="h-16 bg-white/5 rounded"></div>
            </div>
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-white/[0.08] space-y-5 max-w-xl mx-auto my-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
            <Radio size={28} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-[#fafafa]">No Shows Created Yet</h3>
            <p className="text-[#a3a3a3] text-xs max-w-sm mx-auto leading-relaxed">
              Shows allow you to automate episodes on a daily or hourly cadence with customized voices, story counts, and formats.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-primary py-2 px-5 text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            Create Your First Show
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shows.map((show) => {
            const isDialogue = show.format === 'dialogue';
            const wordBudget = (show.target_minutes || 5) * 140;
            const approxStories = Math.max(1, Math.min(10, Math.round((show.target_minutes || 5) * 0.75)));
            const isRunning = runningShowId === show.id;

            return (
              <div 
                key={show.id} 
                className={`glass-panel p-6 rounded-2xl flex flex-col justify-between border transition-colors relative group ${
                  show.enabled 
                    ? 'border-white/[0.10] hover:border-white/[0.20]' 
                    : 'border-white/5 opacity-60'
                }`}
              >
                <div>
                  {/* Top Bar: Format badge & Switch */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[#a3a3a3] flex items-center gap-1.5">
                        {isDialogue ? <Users size={11} /> : <User size={11} />}
                        {isDialogue ? 'Dialogue' : 'Monologue'}
                      </span>
                      
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[#a3a3a3]">
                        {show.target_minutes || 5} min
                      </span>
                    </div>

                    {/* Enable Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggle(show.id, show.name)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        show.enabled ? 'bg-white' : 'bg-[#262626]'
                      }`}
                      title={show.enabled ? 'Click to Disable' : 'Click to Enable'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
                          show.enabled ? 'translate-x-4 bg-[#0a0a0a]' : 'translate-x-0.5 bg-white/60'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Title & Description */}
                  <h3 className="text-base font-bold text-[#fafafa] group-hover:text-white transition-colors line-clamp-1 mb-1 tracking-tight">
                    {show.name}
                  </h3>
                  <p className="text-[#a3a3a3] text-xs line-clamp-2 mb-4 min-h-[32px] leading-relaxed">
                    {show.description || 'No description provided.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="space-y-2 py-3 border-y border-white/[0.06] text-xs text-[#a3a3a3]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#737373] w-16">Source:</span>
                      <span className="font-medium text-white capitalize">
                        {show.source_id?.replace(/_/g, ' ')} • {show.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#737373] w-16">Schedule:</span>
                      <span className="flex items-center gap-1 text-white font-medium">
                        <Clock size={12} className="text-[#737373]" />
                        {formatScheduleLabel(show.schedule)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#737373] w-16">Pacing:</span>
                      <span>~{wordBudget} words (~{approxStories} stories)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#737373] w-16">Episodes:</span>
                      <span className="text-[#fafafa] font-semibold">{show.episode_count || 0} generated</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 flex items-center justify-between gap-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleRunNow(show.id, show.name)}
                    disabled={isRunning}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-[#e5e5e5] text-[#0a0a0a] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isRunning ? (
                      <RefreshCw size={13} className="animate-spin text-black" />
                    ) : (
                      <Play size={13} className="fill-current" />
                    )}
                    {isRunning ? 'Starting...' : 'Run Now'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyFeed(show.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                    title={copiedShowId === show.id ? 'Copied RSS Feed URL!' : 'Copy Apple Podcasts / RSS Feed URL'}
                  >
                    {copiedShowId === show.id ? <Check size={14} className="text-white" /> : <Rss size={14} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(show)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#a3a3a3] hover:text-white border border-white/10 transition-colors cursor-pointer"
                    title="Edit Show"
                  >
                    <Settings size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(show.id, show.name)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#737373] hover:text-[#f87171] border border-white/10 transition-colors cursor-pointer"
                    title="Delete Show"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 border border-white/15 shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white text-[#0a0a0a] rounded-xl flex items-center justify-center shadow-sm">
                  <Radio size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#fafafa] tracking-tight">
                    {editingShow ? 'Edit Show Configuration' : 'Create Recurring Show'}
                  </h2>
                  <p className="text-[#737373] text-xs">
                    Configure automated podcast generation parameters and schedule.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-[#737373] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveShow} className="space-y-6">
              {/* Show Name & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    Show Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Daily Tech Radar, Morning Financial Pulse"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-white/10 text-white placeholder-[#737373] focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief overview of what this show covers..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-white/10 text-white placeholder-[#737373] focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 text-xs font-medium resize-none"
                  />
                </div>
              </div>

              {/* Source & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    News Outlet
                  </label>
                  <select
                    value={formData.source_id}
                    onChange={e => {
                      const newSourceId = e.target.value;
                      const sObj = sources.find(s => s.id === newSourceId);
                      setFormData({ 
                        ...formData, 
                        source_id: newSourceId,
                        category: sObj?.categories[0]?.id || 'national'
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-white/10 text-white focus:outline-none focus:border-white/40 text-xs font-medium"
                  >
                    {sources.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#111111] text-white">
                        {s.name} ({s.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-white/10 text-white focus:outline-none focus:border-white/40 text-xs font-medium"
                  >
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#111111] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format & Tone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'monologue' })}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        formData.format === 'monologue'
                          ? 'bg-white text-[#0a0a0a] border-white font-semibold'
                          : 'bg-white/5 text-[#a3a3a3] border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <User size={14} />
                      Monologue
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'dialogue' })}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        formData.format === 'dialogue'
                          ? 'bg-white text-[#0a0a0a] border-white font-semibold'
                          : 'bg-white/5 text-[#a3a3a3] border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Users size={14} />
                      Dialogue
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    Editorial Tone
                  </label>
                  <select
                    value={formData.tone}
                    onChange={e => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-white/10 text-white focus:outline-none focus:border-white/40 text-xs font-medium"
                  >
                    {TONE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value} className="bg-[#111111] text-white">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Voice Selection */}
              {formData.format === 'dialogue' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    Dual Host Pair
                  </label>
                  <select
                    onChange={e => handleSelectHostPair(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-white/10 text-white focus:outline-none focus:border-white/40 text-xs font-medium"
                  >
                    {hostPairs.map(hp => (
                      <option key={hp.id} value={hp.id} className="bg-[#111111] text-white">
                        {hp.name} ({hp.voice_a_name} & {hp.voice_b_name})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                    Narrator Voice
                  </label>
                  <select
                    value={formData.voice}
                    onChange={e => setFormData({ ...formData, voice: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-white/10 text-white focus:outline-none focus:border-white/40 text-xs font-medium"
                  >
                    {voices.map(v => (
                      <option key={v.id} value={v.id} className="bg-[#111111] text-white">
                        {v.name} ({v.locale} - {v.gender})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Minutes Slider */}
              <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-[#fafafa]">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-white" />
                    Target Length: {formData.target_minutes} Minutes
                  </span>
                  <span className="text-xs text-[#a3a3a3] font-medium">
                    ~{formData.target_minutes * 140} words • ~{Math.max(1, Math.min(10, Math.round(formData.target_minutes * 0.75)))} stories
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={formData.target_minutes}
                  onChange={e => setFormData({ ...formData, target_minutes: parseInt(e.target.value, 10) })}
                  className="w-full accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#737373]">
                  <span>2 min (Quick Brief)</span>
                  <span>5 min (Standard)</span>
                  <span>10 min (In-Depth)</span>
                  <span>20 min (Feature)</span>
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider">
                  Cadence & Schedule (APScheduler)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SCHEDULE_PRESETS.map(preset => {
                    const isSelected = preset.value === 'custom' ? isCustomSchedule : (formData.schedule === preset.value && !isCustomSchedule);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          if (preset.value === 'custom') {
                            setIsCustomSchedule(true);
                          } else {
                            setIsCustomSchedule(false);
                            setFormData({ ...formData, schedule: preset.value });
                          }
                        }}
                        className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#0a0a0a] font-semibold border-white shadow-sm'
                            : 'bg-white/5 text-[#a3a3a3] border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {isCustomSchedule && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block text-xs font-medium text-[#737373] mb-1">
                      Cron Expression (5-field: minute hour day month weekday)
                    </label>
                    <input
                      type="text"
                      value={customScheduleInput}
                      onChange={e => setCustomScheduleInput(e.target.value)}
                      placeholder="e.g. 0 8 * * * or 30 14 * * 1-5"
                      className="w-full px-4 py-2 rounded-xl bg-[#111111] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-white/40"
                    />
                  </div>
                )}
              </div>

              {/* Enabled Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="enabledCheckbox"
                  checked={formData.enabled}
                  onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-white cursor-pointer"
                />
                <label htmlFor="enabledCheckbox" className="text-xs font-medium text-[#a3a3a3] cursor-pointer">
                  Enable scheduled automation immediately after saving
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-5 text-xs font-semibold"
                >
                  {editingShow ? 'Update Show' : 'Create Show'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shows;
