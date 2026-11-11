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
      <div className="p-8 text-center text-[#737373] text-xs">
        No transcript data available for this episode.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 p-2 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
      {segments.map((seg, idx) => {
        const isActive = idx === activeIndex;
        const isSpeakerA = seg.speaker.includes('A');
        const isSpeakerB = seg.speaker.includes('B');

        return (
          <div
            key={idx}
            ref={isActive ? activeItemRef : null}
            onClick={() => onSeek && onSeek(seg.start)}
            className={`p-3 rounded-xl border transition-colors cursor-pointer group flex gap-3 items-start ${
              isActive
                ? 'bg-white/[0.07] border-white text-white shadow-sm'
                : 'bg-white/[0.02] border-white/5 text-[#a3a3a3] hover:bg-white/[0.04] hover:border-white/10 hover:text-white'
            }`}
          >
            {/* Timestamp & Play Icon */}
            <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 transition-colors ${
                  isActive
                    ? 'bg-white text-[#0a0a0a] border-white'
                    : 'bg-white/5 border-white/10 text-[#737373] group-hover:text-white group-hover:border-white/20'
                }`}
              >
                <Play size={9} className={isActive ? 'fill-[#0a0a0a] text-[#0a0a0a]' : 'group-hover:fill-white text-transparent'} />
                {formatTime(seg.start)}
              </span>
            </div>

            {/* Turn Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[#a3a3a3] tracking-wider flex items-center gap-1">
                  {isSpeakerA || isSpeakerB ? <Users size={10} /> : <User size={10} />}
                  {seg.speaker}
                </span>
                {isActive && (
                  <span className="text-[10px] text-white font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Speaking now
                  </span>
                )}
              </div>

              <p className={`text-xs leading-relaxed ${isActive ? 'font-medium text-[#fafafa]' : 'text-[#a3a3a3]'}`}>
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
