import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  Download, 
  Layers, 
  FileEdit, 
  Mic2, 
  Music2, 
  Check 
} from 'lucide-react';
import { getEpisodeEventsUrl } from '../services/api';

const STAGES = [
  { id: 'fetching', label: 'Fetching', icon: Download, desc: 'Pulling news feeds & articles' },
  { id: 'ranking', label: 'Ranking', icon: Layers, desc: 'Deduplicating & clustering topics' },
  { id: 'scripting', label: 'Scripting', icon: FileEdit, desc: 'AI dialogue & fact-checking' },
  { id: 'voicing', label: 'Voicing', icon: Mic2, desc: 'Edge-TTS voice track generation' },
  { id: 'mixing', label: 'Mixing', icon: Music2, desc: 'Stitching turns, pauses & jingles' },
  { id: 'done', label: 'Ready', icon: Check, desc: 'Episode complete and ready' }
];

const PipelineStepper = ({ episodeId, onComplete, onFail }) => {
  const [currentStage, setCurrentStage] = useState('fetching');
  const [progress, setProgress] = useState(15);
  const [message, setMessage] = useState('Initializing pipeline...');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!episodeId) return;

    const eventUrl = getEpisodeEventsUrl(episodeId);
    const eventSource = new EventSource(eventUrl);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.stage) {
          setCurrentStage(data.stage);
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.message) setMessage(data.message);

          if (data.stage === 'done') {
            eventSource.close();
            if (onComplete) onComplete(data.payload);
          } else if (data.stage === 'failed') {
            eventSource.close();
            setError(data.message || 'Episode generation failed.');
            if (onFail) onFail(data.message);
          }
        }
      } catch (err) {
        console.warn('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [episodeId, onComplete, onFail]);

  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="bg-[#111111] border border-white/[0.08] p-5 rounded-2xl space-y-5 shadow-sm animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span className="text-[11px] font-bold text-white tracking-wider uppercase">
              Pipeline Tracker
            </span>
          </div>
          <h4 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
            {error ? 'Generation Encountered an Error' : message}
          </h4>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white">
          {error ? 'Failed' : `${progress}%`}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            error ? 'bg-[#f87171]' : 'bg-white'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stepper Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {STAGES.map((step, idx) => {
          const Icon = step.icon;
          const isDone = currentStageIndex > idx || currentStage === 'done';
          const isCurrent = currentStageIndex === idx && !error && currentStage !== 'done';
          const isFailed = error && currentStageIndex === idx;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-colors flex flex-col items-center text-center gap-2 ${
                isDone
                  ? 'bg-white/[0.03] border-white/10 text-[#a3a3a3]'
                  : isCurrent
                  ? 'bg-white/[0.08] border-white text-white shadow-sm'
                  : isFailed
                  ? 'bg-white/5 border-white/10 text-[#f87171]'
                  : 'bg-white/[0.02] border-white/5 text-[#737373]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDone
                    ? 'bg-white/10 text-white'
                    : isCurrent
                    ? 'bg-white text-[#0a0a0a]'
                    : isFailed
                    ? 'bg-white/10 text-[#f87171]'
                    : 'bg-white/5 text-[#737373]'
                }`}
              >
                {isDone ? (
                  <Check size={14} />
                ) : isCurrent ? (
                  <Loader2 size={14} className="animate-spin text-black" />
                ) : isFailed ? (
                  <AlertCircle size={14} />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              <div className="space-y-0.5">
                <div className={`text-xs font-semibold ${isCurrent ? 'text-white' : 'text-[#a3a3a3]'}`}>
                  {step.label}
                </div>
                <div className="text-[10px] text-[#737373] line-clamp-1">
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5 text-[#f87171] text-xs">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-[#f87171]" />
          <div>
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineStepper;
