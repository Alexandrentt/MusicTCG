'use client';

import { useEffect, useRef, useState } from 'react';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, volume, togglePlayPause, playNext, setVolume } = useMusicPlayer();
  const { isInBattle, playMusicInBattle, setInspectingCard } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const handleInspect = () => {
    if (currentTrack) {
      // Create a dummy CardData from currentTrack.
      // In a real scenario, we might want to fetch the full card data,
      // but the studio page can handle partial data or we can pass what we have.
      setInspectingCard({
        id: currentTrack.id,
        name: currentTrack.title,
        artist: currentTrack.artist,
        artworkUrl: currentTrack.artworkUrl,
        previewUrl: currentTrack.url,
        genre: 'Pop',
        rarity: 'BRONZE',
        stats: { atk: 0, def: 0 },
        atk: 0,
        def: 0,
        cost: 0,
        type: 'CREATURE',
        abilities: [],
        keywords: [],
        videoId: ''
      });
      router.push('/studio');
    }
  };

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
    if (!audio) return;

    const shouldPlay = isPlaying && (!isInBattle || playMusicInBattle);
    audio.volume = volume;

    if (currentTrack && audio.src !== currentTrack.url) {
      // Stop any current playback before changing source
      audio.pause();
      audio.src = currentTrack.url;
      audio.load();
      if (shouldPlay) {
        // Wait for audio to be ready before playing
        const playWhenReady = () => {
          audio.play().catch((e) => {
            if (e.name !== 'AbortError') {
              console.error("Audio play failed:", e);
            }
          });
        };
        audio.addEventListener('canplay', playWhenReady, { once: true });
      }
    } else if (currentTrack) {
      if (shouldPlay) {
        // Only play if audio is ready
        if (audio.readyState >= 2) {
          audio.play().catch((e) => {
            if (e.name !== 'AbortError') {
              console.error("Audio play failed:", e);
            }
          });
        }
      } else {
        audio.pause();
      }
    }

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

      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleInspect}>
        <Image src={currentTrack.artworkUrl} alt={currentTrack.title} width={40} height={40} className="w-10 h-10 rounded object-cover" crossOrigin="anonymous" />
        <div className="flex flex-col min-w-0">
          <span className="text-white text-sm font-bold truncate">{currentTrack.title}</span>
          <span className="text-gray-400 text-xs truncate">{currentTrack.artist}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={togglePlayPause} aria-label={isPlaying ? "Pausar" : "Reproducir"} className="text-white hover:scale-110 transition-transform">
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
        <button onClick={playNext} aria-label="Siguiente Canción" className="text-gray-400 hover:text-white transition-colors">
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
