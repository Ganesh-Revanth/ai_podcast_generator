import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { BASE_URL } from '../services/api';

const AudioPlayerContext = createContext(null);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());
  const playEpisodeRef = useRef(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [sleepTimer, setSleepTimer] = useState({ active: false, secondsLeft: 0, label: 'Off' });
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const playEpisodeInternal = useCallback((episode) => {
    if (!episode || !episode.audio_url) return;
    const audio = audioRef.current;

    const fullUrl = episode.audio_url.startsWith('http')
      ? episode.audio_url
      : `${BASE_URL}${episode.audio_url}`;

    if (audio.src !== fullUrl) {
      audio.src = fullUrl;
      audio.playbackRate = playbackRate;
      audio.volume = isMuted ? 0 : volume;
    }

    audio.play().catch((err) => {
      console.warn('Audio playback failed or was blocked by browser autoplay policy:', err);
    });

    setCurrentEpisode(episode);
    setIsPlaying(true);
  }, [playbackRate, volume, isMuted]);

  useEffect(() => {
    playEpisodeRef.current = playEpisodeInternal;
  }, [playEpisodeInternal]);

  // Synchronize audio event listeners
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      // Auto-advance queue if available
      setQueue((prevQueue) => {
        if (prevQueue.length > 0) {
          const [nextEpisode, ...remaining] = prevQueue;
          setTimeout(() => {
            if (playEpisodeRef.current) {
              playEpisodeRef.current(nextEpisode);
            }
          }, 100);
          return remaining;
        }
        return prevQueue;
      });
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
    };
  }, []);

  // Sleep timer interval
  useEffect(() => {
    if (!sleepTimer.active || sleepTimer.secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSleepTimer((prev) => {
        if (!prev.active) return prev;
        if (prev.secondsLeft <= 1) {
          audioRef.current.pause();
          return { active: false, secondsLeft: 0, label: 'Off' };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer.active, sleepTimer.secondsLeft]);

  const playEpisode = useCallback((episode) => {
    if (!episode) return;
    const audio = audioRef.current;

    if (currentEpisode && currentEpisode.id === episode.id) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.warn);
      }
      return;
    }

    playEpisodeInternal(episode);
  }, [currentEpisode, isPlaying, playEpisodeInternal]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentEpisode) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.warn);
    }
  }, [currentEpisode, isPlaying]);

  const seek = useCallback((timeInSeconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(audio.duration || 999999, timeInSeconds));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const skip = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = (audio.currentTime || 0) + seconds;
    seek(target);
  }, [seek]);

  const setSpeed = useCallback((rate) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
    setPlaybackRate(rate);
  }, []);

  const setVolume = useCallback((val) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(1, val));
    if (audio) {
      audio.volume = clamped;
      audio.muted = (clamped === 0);
    }
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      const nextMuted = !audio.muted;
      audio.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  }, []);

  const setSleep = useCallback((minutes) => {
    if (minutes === 'off' || minutes === 0) {
      setSleepTimer({ active: false, secondsLeft: 0, label: 'Off' });
    } else if (minutes === 'end_of_episode') {
      const remainingSec = Math.max(5, Math.round(duration - currentTime));
      setSleepTimer({ active: true, secondsLeft: remainingSec, label: 'End of Ep' });
    } else {
      const secs = minutes * 60;
      setSleepTimer({ active: true, secondsLeft: secs, label: `${minutes}m` });
    }
  }, [duration, currentTime]);

  const addToQueue = useCallback((episode) => {
    setQueue((prev) => {
      if (prev.some((e) => e.id === episode.id)) return prev;
      return [...prev, episode];
    });
  }, []);

  const removeFromQueue = useCallback((episodeId) => {
    setQueue((prev) => prev.filter((e) => e.id !== episodeId));
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const [next, ...remaining] = queue;
    setQueue(remaining);
    playEpisodeInternal(next);
  }, [queue, playEpisodeInternal]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const toggleTranscript = useCallback(() => {
    setIsTranscriptOpen((prev) => !prev);
  }, []);

  const toggleQueue = useCallback(() => {
    setIsQueueOpen((prev) => !prev);
  }, []);

  const value = {
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
    playEpisode,
    togglePlay,
    seek,
    skip,
    setSpeed,
    setVolume,
    toggleMute,
    setSleep,
    addToQueue,
    removeFromQueue,
    playNext,
    clearQueue,
    toggleTranscript,
    toggleQueue,
    setIsTranscriptOpen,
    setIsQueueOpen
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
