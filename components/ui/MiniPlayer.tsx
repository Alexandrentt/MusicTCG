'use client';

import { useEffect, useRef, useState } from 'react';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, volume, togglePlayPause, playNext, setVolume } = useMusicPlayer();
  const { isInBattle, playMusicInBattle } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        useMusicPlayer.getState().playNext();
      });
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current && audioRef.current.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      });
    }

    const audio = audioRef.current;
    
    const shouldPlay = isPlaying && (!isInBattle || playMusicInBattle);

    if (currentTrack && audio.src !== currentTrack.url) {
      audio.src = currentTrack.url;
      audio.load();
      if (shouldPlay) {
        audio.play().catch(e => console.error("Audio play failed:", e));
      }
    } else if (currentTrack) {
      if (shouldPlay) {
        audio.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audio.pause();
      }
    }

    audio.volume = volume;

    return () => {
      // Don't destroy audio on unmount to keep it playing across pages
      // Just update event listeners if needed
    };
  }, [currentTrack, isPlaying, volume, playNext, isInBattle, playMusicInBattle]);

  if (!currentTrack || isInBattle) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-[#181818] border-t border-white/10 p-2 z-40 flex items-center justify-between px-4 animate-in slide-in-from-bottom-2">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 h-0.5 bg-green-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentTrack.artUrl} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" crossOrigin="anonymous" />
        <div className="flex flex-col min-w-0">
          <span className="text-white text-sm font-bold truncate">{currentTrack.title}</span>
          <span className="text-gray-400 text-xs truncate">{currentTrack.artist}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={togglePlayPause} className="text-white hover:scale-110 transition-transform">
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
        <button onClick={playNext} className="text-gray-400 hover:text-white transition-colors">
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
