import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
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
      // EventSource automatically retries, or closes on completed
    };

    return () => {
      eventSource.close();
    };
  }, [episodeId, onComplete, onFail]);

  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-6 shadow-2xl animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
            <span className="text-xs font-bold text-primary tracking-wider uppercase">
              Real-time Pipeline Tracker
            </span>
          </div>
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            {error ? 'Generation Encountered an Error' : message}
          </h4>
        </div>
        <span className="text-sm font-mono font-bold px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-primary">
          {error ? 'Failed' : `${progress}%`}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            error
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-primary via-accent to-emerald-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stepper Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {STAGES.map((step, idx) => {
          const Icon = step.icon;
          const isDone = currentStageIndex > idx || currentStage === 'done';
          const isCurrent = currentStageIndex === idx && !error && currentStage !== 'done';
          const isFailed = error && currentStageIndex === idx;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center gap-2 ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : isCurrent
                  ? 'bg-primary/20 border-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-primary'
                  : isFailed
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-white/5 border-white/5 text-gray-500'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDone
                    ? 'bg-emerald-500 text-black font-bold'
                    : isCurrent
                    ? 'bg-primary text-white shadow-lg'
                    : isFailed
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={18} />
                ) : isCurrent ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isFailed ? (
                  <AlertCircle size={18} />
                ) : (
                  <Icon size={18} />
                )}
              </div>
              <div className="space-y-0.5">
                <div className={`text-xs font-bold ${isCurrent ? 'text-white' : ''}`}>
                  {step.label}
                </div>
                <div className="text-[10px] text-gray-400 line-clamp-1">
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-400" />
          <div className="space-y-1">
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineStepper;
