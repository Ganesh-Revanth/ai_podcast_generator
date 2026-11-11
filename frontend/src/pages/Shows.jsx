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
  X
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
  getHostPairs 
} from '../services/api';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
      console.error('Failed to load shows:', err);
      setError('Could not load shows. Please ensure the backend is running.');
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
      category: sources[0]?.categories[0]?.id || 'national',
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
    const isPreset = SCHEDULE_PRESETS.some(p => p.value === show.schedule);
    setIsCustomSchedule(!isPreset);
    if (!isPreset) {
      setCustomScheduleInput(show.schedule || '0 8 * * *');
    }
    setFormData({
      name: show.name || '',
      description: show.description || '',
      source_id: show.source_id || 'the_hindu',
      category: show.category || 'national',
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
        target_minutes: parseInt(formData.target_minutes, 10) || 5,
        schedule: isCustomSchedule ? customScheduleInput : formData.schedule,
      };

      if (editingShow) {
        await updateShow(editingShow.id, payload);
        showNotification(`Show "${payload.name}" updated successfully.`);
      } else {
        await createShow(payload);
        showNotification(`Show "${payload.name}" created successfully.`);
      }
      setIsModalOpen(false);
      loadAll();
    } catch (err) {
      console.error('Failed to save show:', err);
      alert('Failed to save show. Please verify all fields.');
    }
  };

  const handleToggle = async (id, currentName) => {
    try {
      const res = await toggleShow(id);
      const updated = res.data;
      setShows(shows.map(s => s.id === id ? updated : s));
      showNotification(`Show "${currentName}" is now ${updated.enabled ? 'Enabled' : 'Disabled'}.`);
    } catch (err) {
      console.error('Failed to toggle show:', err);
      alert('Could not update show status.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the show "${name}"? Associated episodes will be deleted.`)) {
      return;
    }
    try {
      await deleteShow(id);
      setShows(shows.filter(s => s.id !== id));
      showNotification(`Show "${name}" was deleted.`);
    } catch (err) {
      console.error('Failed to delete show:', err);
      alert('Could not delete show.');
    }
  };

  const handleRunNow = async (id, name) => {
    try {
      setRunningShowId(id);
      await runShow(id);
      showNotification(`Generation started for "${name}". Redirecting to history...`);
      setTimeout(() => {
        navigate('/history');
      }, 1500);
    } catch (err) {
      console.error('Failed to trigger run now:', err);
      alert('Failed to trigger generation. Check backend logs.');
      setRunningShowId(null);
    }
  };

  const selectedSourceObj = sources.find(s => s.id === formData.source_id);
  const availableCategories = selectedSourceObj ? selectedSourceObj.categories : [];

  const handleSelectHostPair = (pairId) => {
    const pair = hostPairs.find(p => p.id === pairId);
    if (pair) {
      setFormData(prev => ({
        ...prev,
        voice_a: pair.voice_a,
        voice_b: pair.voice_b
      }));
    }
  };

  const formatScheduleLabel = (sched) => {
    if (!sched) return 'No schedule set';
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
            <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg shadow-primary/20 text-white">
              <Radio size={24} />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Recurring Shows</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Create scheduled podcast programs that automatically generate fresh episodes from your chosen sources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-medium transition-all"
            title="Refresh Shows"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all cursor-pointer"
          >
            <Plus size={20} />
            Create Show
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-fade-in">
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-fade-in">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Shows Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel p-6 rounded-2xl animate-pulse space-y-4">
              <div className="h-6 bg-white/10 rounded w-3/4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
              <div className="h-20 bg-white/5 rounded"></div>
            </div>
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-5 max-w-xl mx-auto my-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Radio size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No Shows Created Yet</h3>
            <p className="text-gray-400 text-sm">
              Shows allow you to automate episodes on a daily or hourly cadence with customized voices, story counts, and formats.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all cursor-pointer"
          >
            <Plus size={20} />
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
                className={`glass-panel p-6 rounded-2xl flex flex-col justify-between border transition-all duration-300 relative group ${
                  show.enabled 
                    ? 'border-white/15 hover:border-primary/40 shadow-lg' 
                    : 'border-white/5 opacity-70 hover:opacity-90'
                }`}
              >
                <div>
                  {/* Top Bar: Format badge & Switch */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                        isDialogue 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {isDialogue ? <Users size={12} /> : <User size={12} />}
                        {isDialogue ? 'Dialogue' : 'Monologue'}
                      </span>
                      
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 text-gray-300 border border-white/10">
                        {show.target_minutes || 5} min
                      </span>
                    </div>

                    {/* Enable Toggle Switch */}
                    <button
                      onClick={() => handleToggle(show.id, show.name)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        show.enabled ? 'bg-primary' : 'bg-gray-700'
                      }`}
                      title={show.enabled ? 'Click to Disable' : 'Click to Enable'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          show.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Title & Description */}
                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1 mb-1">
                    {show.name}
                  </h3>
                  <p className="text-gray-400 text-xs line-clamp-2 mb-4 min-h-[32px]">
                    {show.description || 'No description provided.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="space-y-2 py-3 border-y border-white/5 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-16">Source:</span>
                      <span className="font-medium text-white capitalize">
                        {show.source_id?.replace(/_/g, ' ')} • {show.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-16">Schedule:</span>
                      <span className="flex items-center gap-1 text-accent font-medium">
                        <Clock size={12} />
                        {formatScheduleLabel(show.schedule)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-16">Pacing:</span>
                      <span>~{wordBudget} words (~{approxStories} stories)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-16">Episodes:</span>
                      <span className="text-gray-200 font-semibold">{show.episode_count || 0} generated</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleRunNow(show.id, show.name)}
                    disabled={isRunning}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-medium text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRunning ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} className="fill-current" />
                    )}
                    {isRunning ? 'Starting...' : 'Run Now'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(show)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                    title="Edit Show"
                  >
                    <Settings size={15} />
                  </button>

                  <button
                    onClick={() => handleDelete(show.id, show.name)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                    title="Delete Show"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 border border-white/15 shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl text-primary">
                  <Radio size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingShow ? 'Edit Show Configuration' : 'Create Recurring Show'}
                  </h2>
                  <p className="text-gray-400 text-xs">
                    Configure automated podcast generation parameters and schedule.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveShow} className="space-y-6">
              {/* Show Name & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
                    Show Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Daily Tech Radar, Morning Financial Pulse"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief overview of what this show covers..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Source & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
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
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1c23] border border-white/10 text-white focus:outline-none focus:border-primary"
                  >
                    {sources.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#1a1c23] text-white">
                        {s.name} ({s.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1c23] border border-white/10 text-white focus:outline-none focus:border-primary"
                  >
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1a1c23] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format & Tone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
                    Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'monologue' })}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                        formData.format === 'monologue'
                          ? 'bg-primary/20 text-primary border-primary/50'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <User size={16} />
                      Monologue
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'dialogue' })}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                        formData.format === 'dialogue'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Users size={16} />
                      Dialogue
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
                    Editorial Tone
                  </label>
                  <select
                    value={formData.tone}
                    onChange={e => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1c23] border border-white/10 text-white focus:outline-none focus:border-primary"
                  >
                    {TONE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value} className="bg-[#1a1c23] text-white">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Voice Selection */}
              {formData.format === 'dialogue' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
                    Dual Host Pair
                  </label>
                  <select
                    onChange={e => handleSelectHostPair(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1c23] border border-white/10 text-white focus:outline-none focus:border-primary"
                  >
                    {hostPairs.map(hp => (
                      <option key={hp.id} value={hp.id} className="bg-[#1a1c23] text-white">
                        {hp.name} ({hp.voice_a_name} & {hp.voice_b_name})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1.5">
                    Narrator Voice
                  </label>
                  <select
                    value={formData.voice}
                    onChange={e => setFormData({ ...formData, voice: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1c23] border border-white/10 text-white focus:outline-none focus:border-primary"
                  >
                    {voices.map(v => (
                      <option key={v.id} value={v.id} className="bg-[#1a1c23] text-white">
                        {v.name} ({v.locale} - {v.gender})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Minutes Slider */}
              <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-200">
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} className="text-primary" />
                    Target Length: {formData.target_minutes} Minutes
                  </span>
                  <span className="text-xs text-primary font-medium">
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
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>2 min (Quick Brief)</span>
                  <span>5 min (Standard)</span>
                  <span>10 min (In-Depth)</span>
                  <span>20 min (Feature)</span>
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-200">
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
                        className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/20 text-white border-primary'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {isCustomSchedule && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Cron Expression (5-field: minute hour day month weekday)
                    </label>
                    <input
                      type="text"
                      value={customScheduleInput}
                      onChange={e => setCustomScheduleInput(e.target.value)}
                      placeholder="e.g. 0 8 * * * or 30 14 * * 1-5"
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-primary"
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
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <label htmlFor="enabledCheckbox" className="text-sm font-medium text-gray-300 cursor-pointer">
                  Enable scheduled automation immediately after saving
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary/25 transition-all cursor-pointer"
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
