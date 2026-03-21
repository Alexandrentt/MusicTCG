// src/lib/engine/sharedPlaylistService.ts

import { GlobalTrack, SharedPlaylistState, GlobalBonusType } from '@/types/sharedPlaylist';
import { generateUUID } from '@/lib/onboarding/onboardingState';

const GENRES = ['Rock', 'Electronic', 'Jazz', 'Pop', 'Lo-Fi', 'Metal', 'Synthwave', 'Classical'];
const BONUSES: GlobalBonusType[] = ['ATK', 'DEF', 'HYPE', 'DRAW', 'ENERGY'];

function generateMockTrack(): GlobalTrack {
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    const bonus = BONUSES[Math.floor(Math.random() * BONUSES.length)];

    return {
        id: generateUUID(),
        title: `Sync Wave - ${Math.floor(Math.random() * 100)}`,
        artist: `Artist-${Math.floor(Math.random() * 20)}`,
        genre,
        bpm: 80 + Math.floor(Math.random() * 100),
        bonusType: bonus,
        bonusValue: bonus === 'DRAW' || bonus === 'ENERGY' ? 1 : 2,
        durationSeconds: 20 + Math.floor(Math.random() * 10),
        startTime: Date.now(),
    };
}

let globalState: SharedPlaylistState = {
    currentTrack: null,
    upcomingTracks: Array.from({ length: 5 }, generateMockTrack),
    history: [],
};

export function getSharedPlaylist(): SharedPlaylistState {
    const now = Date.now();

    // Si no hay track actual o expiró, rotar
    if (!globalState.currentTrack || (now - globalState.currentTrack.startTime) / 1000 >= globalState.currentTrack.durationSeconds) {
        if (globalState.currentTrack) {
            globalState.history.push(globalState.currentTrack);
        }

        globalState.currentTrack = globalState.upcomingTracks.shift() || generateMockTrack();
        globalState.currentTrack.startTime = now;
        globalState.upcomingTracks.push(generateMockTrack());
    }

    return { ...globalState };
}

export function checkCoincidenceBonus(cardGenre: string): { type: GlobalBonusType; value: number } | null {
    const track = globalState.currentTrack;
    if (!track) return null;

    // Coincidencia de género: 100% de bono
    if (track.genre.toLowerCase() === cardGenre.toLowerCase()) {
        return { type: track.bonusType, value: track.bonusValue };
    }

    return null;
}
