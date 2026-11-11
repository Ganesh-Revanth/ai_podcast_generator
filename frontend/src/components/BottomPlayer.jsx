import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Moon, 
  ListMusic, 
  FileText, 
  X, 
  Trash2, 
  Clock, 
  Headphones
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import SynchronizedTranscript from './SynchronizedTranscript';

const formatTime = (secs) => {
  if (isNaN(secs) || secs < 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [
  { label: 'Off', val: 'off' },
  { label: '5 min', val: 5 },
  { label: '15 min', val: 15 },
  { label: '30 min', val: 30 },
  { label: '45 min', val: 45 },
  { label: 'End of Episode', val: 'end_of_episode' }
];

const BottomPlayer = () => {
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    queue,
    sleepTimer,
    isTranscriptOpen,
    isQueueOpen,
    togglePlay,
    seek,
    skip,
    setSpeed,
    setVolume,
    toggleMute,
    setSleep,
    removeFromQueue,
    clearQueue,
    toggleTranscript,
    toggleQueue
  } = useAudioPlayer();

  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!currentEpisode) {
    return null; // Collapsed when no episode has been initiated
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <>
      {/* Transcript Drawer Modal */}
      {isTranscriptOpen && (
        <div className="fixed inset-x-0 bottom-24 z-40 max-w-4xl mx-auto px-4 animate-fade-in">
          <div className="bg-black/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h3 className="font-bold text-white text-base">
                  Synchronized Transcript: <span className="text-gray-300 font-normal">{currentEpisode.title}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={toggleTranscript}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Close Transcript"
              >
                <X size={18} />
              </button>
            </div>

            <SynchronizedTranscript
              episode={currentEpisode}
              currentTime={currentTime}
              onSeek={seek}
            />
          </div>
        </div>
      )}

      {/* Queue Drawer Modal */}
      {isQueueOpen && (
        <div className="fixed inset-x-0 bottom-24 z-40 max-w-lg mx-auto px-4 animate-fade-in">
          <div className="bg-black/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[460px] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ListMusic size={18} className="text-accent" />
                <h3 className="font-bold text-white text-base">
                  Playback Queue ({queue.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={clearQueue}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleQueue}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {/* Now Playing */}
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <Headphones size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Now Playing</span>
                    <div className="text-sm font-semibold text-white line-clamp-1">{currentEpisode.title}</div>
                  </div>
                </div>
              </div>

              {/* Up Next List */}
              {queue.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs">
                  No upcoming episodes in queue. Add any episode from the library!
                </div>
              ) : (
                queue.map((ep, idx) => (
                  <div
                    key={ep.id}
                    className="p-3 bg-white/5 border border-white/5 hover:border-white/15 rounded-2xl flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-gray-500 w-4 text-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-200 line-clamp-1">{ep.title}</div>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock size={10} /> {formatTime(ep.duration_seconds || 0)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(ep.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-black/85 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
          
          {/* Left: Track Info & Artwork */}
          <div className="flex items-center gap-3.5 w-full md:w-1/4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary/30 to-accent/30 border border-white/15 flex items-center justify-center text-primary flex-shrink-0 shadow-lg shadow-primary/10">
              <Headphones size={22} className={isPlaying ? 'animate-pulse text-white' : 'text-primary'} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate leading-snug">
                {currentEpisode.title}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 uppercase tracking-wider">
                  AI News
                </span>
                {sleepTimer.active && (
                  <span className="text-[10px] font-mono text-accent flex items-center gap-0.5 font-bold">
                    <Moon size={10} /> {formatTime(sleepTimer.secondsLeft)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Controls & Scrubber */}
          <div className="flex-1 w-full max-w-2xl space-y-1.5 flex flex-col items-center">
            {/* Buttons Row */}
            <div className="flex items-center gap-5">
              {/* Skip -15s */}
              <button
                type="button"
                onClick={() => skip(-15)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Skip backward 15 seconds"
              >
                <RotateCcw size={18} />
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} className="fill-white" /> : <Play size={20} className="fill-white ml-0.5" />}
              </button>

              {/* Skip +15s */}
              <button
                type="button"
                onClick={() => skip(15)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Skip forward 15 seconds"
              >
                <RotateCw size={18} />
              </button>
            </div>

            {/* Scrubber Bar */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[11px] font-mono font-medium text-gray-400 min-w-[35px] text-right">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 group py-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary group-hover:h-2 transition-all"
                  style={{
                    background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${progressPercent}%, rgba(255, 255, 255, 0.1) ${progressPercent}%, rgba(255, 255, 255, 0.1) 100%)`
                  }}
                />
              </div>
              <span className="text-[11px] font-mono font-medium text-gray-400 min-w-[40px]">
                -{formatTime(remainingTime)}
              </span>
            </div>
          </div>

          {/* Right: Actions, Speed, Sleep, Queue & Transcript */}
          <div className="flex items-center justify-end gap-2.5 w-full md:w-1/4">
            {/* Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                  playbackRate !== 1
                    ? 'bg-primary/20 border-primary text-primary shadow-sm'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
                title="Playback speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 bg-black/95 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 min-w-[80px]">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        setShowSpeedMenu(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl text-left transition-colors cursor-pointer ${
                        playbackRate === s
                          ? 'bg-primary text-white'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sleep Timer */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSleepMenu(!showSleepMenu)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  sleepTimer.active
                    ? 'bg-accent/20 border-accent text-accent shadow-sm'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                title={`Sleep Timer: ${sleepTimer.label}`}
              >
                <Moon size={16} />
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-10 right-0 bg-black/95 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 min-w-[140px]">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Sleep Timer
                  </div>
                  {SLEEP_OPTIONS.map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        setSleep(opt.val);
                        setShowSleepMenu(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl text-left text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Queue Toggle */}
            <button
              type="button"
              onClick={toggleQueue}
              className={`p-2 rounded-xl border relative transition-all cursor-pointer ${
                isQueueOpen
                  ? 'bg-primary/20 border-primary text-primary shadow-sm'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              title="View Queue"
            >
              <ListMusic size={16} />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-sm">
                  {queue.length}
                </span>
              )}
            </button>

            {/* Transcript Drawer Toggle */}
            <button
              type="button"
              onClick={toggleTranscript}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isTranscriptOpen
                  ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Open Synchronized Transcript"
            >
              <FileText size={16} />
            </button>

            {/* Volume & Mute */}
            <div className="hidden lg:flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={toggleMute}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/15 rounded-full accent-primary cursor-pointer"
              />
            </div>

          </div>

        </div>
      </div>
    </>
  );
};

export default BottomPlayer;
