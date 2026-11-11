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
        <div className="fixed inset-x-0 bottom-20 z-40 max-w-4xl mx-auto px-4 animate-fade-in">
          <div className="bg-[#111111] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-white" />
                <h3 className="font-bold text-[#fafafa] text-sm">
                  Synchronized Transcript: <span className="text-[#a3a3a3] font-normal">{currentEpisode.title}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={toggleTranscript}
                className="p-1.5 rounded-xl hover:bg-white/10 text-[#737373] hover:text-white transition-colors cursor-pointer"
                title="Close Transcript"
              >
                <X size={16} />
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
        <div className="fixed inset-x-0 bottom-20 z-40 max-w-lg mx-auto px-4 animate-fade-in">
          <div className="bg-[#111111] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[460px] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ListMusic size={16} className="text-white" />
                <h3 className="font-bold text-[#fafafa] text-sm">
                  Playback Queue ({queue.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={clearQueue}
                    className="text-xs text-[#f87171] hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleQueue}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-[#737373] hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {/* Now Playing */}
              <div className="p-3 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white text-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                    <Headphones size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white">Now Playing</span>
                    <div className="text-xs font-semibold text-[#fafafa] line-clamp-1">{currentEpisode.title}</div>
                  </div>
                </div>
              </div>

              {/* Up Next List */}
              {queue.length === 0 ? (
                <div className="py-8 text-center text-[#737373] text-xs">
                  No upcoming episodes in queue. Add any episode from the library!
                </div>
              ) : (
                queue.map((ep, idx) => (
                  <div
                    key={ep.id}
                    className="p-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/15 rounded-2xl flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-[#737373] w-4 text-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#fafafa] line-clamp-1">{ep.title}</div>
                        <span className="text-[10px] text-[#737373] flex items-center gap-1">
                          <Clock size={10} /> {formatTime(ep.duration_seconds || 0)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(ep.id)}
                      className="p-1.5 text-[#737373] hover:text-[#f87171] rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-[#111111] border-t border-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.6)] px-4 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-6">
          
          {/* Left: Track Info & Artwork */}
          <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#171717] border border-white/10 flex items-center justify-center text-white flex-shrink-0">
              <Headphones size={18} className={isPlaying ? 'animate-pulse text-white' : 'text-[#a3a3a3]'} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-[#fafafa] truncate leading-snug">
                {currentEpisode.title}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[#a3a3a3] uppercase tracking-wider">
                  AI News
                </span>
                {sleepTimer.active && (
                  <span className="text-[10px] font-mono text-white flex items-center gap-0.5 font-semibold">
                    <Moon size={10} /> {formatTime(sleepTimer.secondsLeft)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Controls & Scrubber */}
          <div className="flex-1 w-full max-w-2xl space-y-1 flex flex-col items-center">
            {/* Buttons Row */}
            <div className="flex items-center gap-4">
              {/* Skip -15s */}
              <button
                type="button"
                onClick={() => skip(-15)}
                className="p-1.5 text-[#737373] hover:text-white rounded-full transition-colors cursor-pointer"
                title="Skip backward 15 seconds"
              >
                <RotateCcw size={16} />
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-[#0a0a0a] hover:bg-[#e5e5e5] flex items-center justify-center shadow-sm transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={17} className="fill-[#0a0a0a] text-[#0a0a0a]" /> : <Play size={17} className="fill-[#0a0a0a] text-[#0a0a0a] ml-0.5" />}
              </button>

              {/* Skip +15s */}
              <button
                type="button"
                onClick={() => skip(15)}
                className="p-1.5 text-[#737373] hover:text-white rounded-full transition-colors cursor-pointer"
                title="Skip forward 15 seconds"
              >
                <RotateCw size={16} />
              </button>
            </div>

            {/* Scrubber Bar */}
            <div className="w-full flex items-center gap-2.5">
              <span className="text-[10px] font-mono font-medium text-[#737373] min-w-[32px] text-right">
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
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%, rgba(255, 255, 255, 0.12) 100%)`
                  }}
                />
              </div>
              <span className="text-[10px] font-mono font-medium text-[#737373] min-w-[36px]">
                -{formatTime(remainingTime)}
              </span>
            </div>
          </div>

          {/* Right: Actions, Speed, Sleep, Queue & Transcript */}
          <div className="flex items-center justify-end gap-2 w-full md:w-1/4">
            {/* Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                  playbackRate !== 1
                    ? 'bg-white text-[#0a0a0a] border-white'
                    : 'bg-white/5 border-white/10 text-[#a3a3a3] hover:text-white'
                }`}
                title="Playback speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 bg-[#171717] border border-white/15 rounded-xl p-1 shadow-2xl z-50 flex flex-col gap-0.5 min-w-[76px]">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        setShowSpeedMenu(false);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                        playbackRate === s
                          ? 'bg-white text-[#0a0a0a]'
                          : 'text-[#a3a3a3] hover:bg-white/10 hover:text-white'
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
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  sleepTimer.active
                    ? 'bg-white text-[#0a0a0a] border-white'
                    : 'bg-white/5 border-white/10 text-[#737373] hover:text-white'
                }`}
                title={`Sleep Timer: ${sleepTimer.label}`}
              >
                <Moon size={14} />
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-9 right-0 bg-[#171717] border border-white/15 rounded-xl p-1 shadow-2xl z-50 flex flex-col gap-0.5 min-w-[130px]">
                  <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#737373]">
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
                      className="px-2.5 py-1 text-xs font-medium rounded-lg text-left text-[#a3a3a3] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
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
              className={`p-1.5 rounded-lg border relative transition-colors cursor-pointer ${
                isQueueOpen
                  ? 'bg-white text-[#0a0a0a] border-white'
                  : 'bg-white/5 border-white/10 text-[#737373] hover:text-white'
              }`}
              title="View Queue"
            >
              <ListMusic size={14} />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-[9px] font-bold text-[#0a0a0a] rounded-full flex items-center justify-center shadow-sm">
                  {queue.length}
                </span>
              )}
            </button>

            {/* Transcript Drawer Toggle */}
            <button
              type="button"
              onClick={toggleTranscript}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isTranscriptOpen
                  ? 'bg-white text-[#0a0a0a] border-white'
                  : 'bg-white/5 border-white/10 text-[#737373] hover:text-white'
              }`}
              title="Open Synchronized Transcript"
            >
              <FileText size={14} />
            </button>

            {/* Volume & Mute */}
            <div className="hidden lg:flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={toggleMute}
                className="text-[#737373] hover:text-white transition-colors p-1 cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-14 h-1 bg-white/15 rounded-full accent-white cursor-pointer"
              />
            </div>

          </div>

        </div>
      </div>
    </>
  );
};

export default BottomPlayer;
