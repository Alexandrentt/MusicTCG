import { create } from 'zustand';

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artworkUrl: string;
}

interface MusicPlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  
  // Actions
  playTrack: (track: Track) => void;
  addToQueue: (track: Track) => void;
  playNext: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  clearQueue: () => void;
  setQueue: (tracks: Track[]) => void;
}

export const useMusicPlayer = create<MusicPlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 0.5,

  playTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  
  setQueue: (tracks) => set({ queue: tracks }),

  playNext: () => set((state) => {
    if (state.queue.length > 0) {
      const [nextTrack, ...remainingQueue] = state.queue;
      return { currentTrack: nextTrack, queue: remainingQueue, isPlaying: true };
    }
    return { currentTrack: null, isPlaying: false };
  }),
  
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setVolume: (volume) => set({ volume }),
  
  clearQueue: () => set({ queue: [] }),
}));
