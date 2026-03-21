// src/types/sharedPlaylist.ts

export type GlobalBonusType = 'ATK' | 'DEF' | 'HYPE' | 'DRAW' | 'ENERGY';

export interface GlobalTrack {
    id: string;
    title: string;
    artist: string;
    genre: string;
    bpm: number;
    bonusType: GlobalBonusType;
    bonusValue: number;
    durationSeconds: number;
    startTime: number; // timestamp
}

export interface SharedPlaylistState {
    currentTrack: GlobalTrack | null;
    upcomingTracks: GlobalTrack[];
    history: GlobalTrack[];
}
