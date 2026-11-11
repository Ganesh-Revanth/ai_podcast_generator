import React, { useEffect, useRef, useMemo } from 'react';
import { Play, User, Users } from 'lucide-react';

const formatTime = (secs) => {
  if (isNaN(secs) || secs < 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const SynchronizedTranscript = ({ episode, currentTime = 0, onSeek }) => {
  const activeItemRef = useRef(null);

  // Parse timed segments with fallback to estimated paragraphs
  const segments = useMemo(() => {
    if (!episode) return [];

    if (episode.transcript_segments) {
      try {
        const parsed = JSON.parse(episode.transcript_segments);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Could not parse transcript_segments JSON:', e);
      }
    }

    // Fallback estimation from script if exact segments not yet stored
    if (episode.script) {
      const paragraphs = episode.script
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      const totalWords = paragraphs.reduce((acc, p) => acc + p.split(/\s+/).length, 0) || 1;
      const totalDuration = episode.duration_seconds || 120;

      let elapsed = 0;
      return paragraphs.map((p) => {
        const words = p.split(/\s+/).length;
        const dur = (words / totalWords) * totalDuration;
        const start = elapsed;
        const end = elapsed + dur;
        elapsed = end;

        // Detect speaker tag if dialogue
        let speaker = 'Host';
        let cleanText = p;
        const match = p.match(/^Host\s*([AB]):\s*(.*)$/i);
        if (match) {
          speaker = `Host ${match[1].toUpperCase()}`;
          cleanText = match[2];
        }

        return {
          start: Math.round(start * 10) / 10,
          end: Math.round(end * 10) / 10,
          speaker,
          text: cleanText
        };
      });
    }

    return [];
  }, [episode]);

  // Find currently active segment
  const activeIndex = useMemo(() => {
    if (!segments.length) return -1;
    return segments.findIndex((seg, idx) => {
      const isLast = idx === segments.length - 1;
      return currentTime >= seg.start && (currentTime < seg.end || isLast);
    });
  }, [segments, currentTime]);

  // Auto-scroll active segment into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeIndex]);

  if (!segments.length) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        No transcript data available for this episode.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
      {segments.map((seg, idx) => {
        const isActive = idx === activeIndex;
        const isSpeakerA = seg.speaker.includes('A');
        const isSpeakerB = seg.speaker.includes('B');

        return (
          <div
            key={idx}
            ref={isActive ? activeItemRef : null}
            onClick={() => onSeek && onSeek(seg.start)}
            className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer group flex gap-3.5 items-start ${
              isActive
                ? 'bg-primary/20 border-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-primary/50'
                : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/15 hover:text-white'
            }`}
          >
            {/* Timestamp & Play Icon */}
            <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-black/30 border-white/10 text-gray-400 group-hover:text-primary group-hover:border-primary/40'
                }`}
              >
                <Play size={10} className={isActive ? 'fill-white' : 'group-hover:fill-primary'} />
                {formatTime(seg.start)}
              </span>
            </div>

            {/* Turn Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wider flex items-center gap-1 ${
                    isSpeakerA
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : isSpeakerB
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isSpeakerA || isSpeakerB ? <Users size={10} /> : <User size={10} />}
                  {seg.speaker}
                </span>
                {isActive && (
                  <span className="text-[10px] text-primary font-bold animate-pulse">
                    ● Speaking now
                  </span>
                )}
              </div>

              <p className={`text-sm leading-relaxed ${isActive ? 'font-medium text-white' : 'text-gray-300'}`}>
                {seg.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SynchronizedTranscript;
