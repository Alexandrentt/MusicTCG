// lib/engine/playlistSynergies.ts
// Sistema de Sinergias de Playlist — "La Magia de la Setlist"
// Cada sinergia evalúa el estado de las cartas recientes para dar bonificaciones

import { CardData } from '@/lib/engine/generator';
import { PlaylistSynergy } from '@/types/playlistCombat';

// ════════════════════════════════════════════════════════════
// TODAS LAS SINERGIAS DEL SISTEMA
// ════════════════════════════════════════════════════════════

export const PLAYLIST_SYNERGIES: PlaylistSynergy[] = [
    {
        id: 'album_concept',
        name: '🎵 Concepto de Álbum',
        description: 'Tocar 3+ canciones del mismo álbum seguidas',
        bonus: { atk: 2, def: 2 },
        check: (recent) => {
            if (recent.length < 3) return false;
            const last3 = recent.slice(-3);
            return last3.every(c => c.album && c.album === last3[0].album);
        },
    },
    {
        id: 'genre_streak',
        name: '🎸 Racha de Género',
        description: 'Tocar 3+ canciones del mismo género consecutivamente',
        bonus: { hype: 1 },
        check: (recent) => {
            if (recent.length < 3) return false;
            const last3 = recent.slice(-3);
            return last3.every(c => c.genre === last3[0].genre);
        },
    },
    {
        id: 'crescendo_chain',
        name: '📈 Crescendo',
        description: 'Cada nueva carta tiene mayor costo (energía) que la anterior',
        bonus: { atk: 3 },
        check: (recent) => {
            if (recent.length < 3) return false;
            const last3 = recent.slice(-3);
            return last3[1].cost > last3[0].cost && last3[2].cost > last3[1].cost;
        },
    },
    {
        id: 'slow_to_fast',
        name: '⚡ De Balada a Banger',
        description: 'Pasar de una carta de bajo costo a una de alto costo',
        bonus: { energy: 1 },
        check: (recent) => {
            if (recent.length < 2) return false;
            const prev = recent[recent.length - 2];
            const curr = recent[recent.length - 1];
            return prev.cost <= 2 && curr.cost >= 5;
        },
    },
    {
        id: 'featuring_chain',
        name: '🤝 Featuring Chain',
        description: '2+ canciones del mismo artista tocando juntas',
        bonus: { atk: 2 },
        check: (recent, full) => {
            if (recent.length < 2) return false;
            const curr = recent[recent.length - 1];
            const sameArtist = recent.slice(0, -1).filter(c => c.artist === curr.artist);
            return sameArtist.length >= 1;
        },
    },
    {
        id: 'vibe_check',
        name: '✅ Vibe Check',
        description: 'Más del 70% de tu playlist es del mismo género',
        bonus: { atk: 1, def: 1, hype: 2 },
        check: (recent, full) => {
            if (full.length < 5) return false;
            const genreCounts: Record<string, number> = {};
            full.forEach(c => {
                if (c.genre) genreCounts[c.genre] = (genreCounts[c.genre] || 0) + 1;
            });
            const maxCount = Math.max(...Object.values(genreCounts));
            return maxCount / full.length > 0.7;
        },
    },
    {
        id: 'indie_discovery',
        name: '💎 Indie Discovery',
        description: '3+ cartas de rareza BRONZE en las últimas 5 tocadas',
        bonus: { def: 3 },
        check: (recent) => {
            const last5 = recent.slice(-5);
            const bronzeCount = last5.filter(c => c.rarity === 'BRONZE').length;
            return bronzeCount >= 3;
        },
    },
    {
        id: 'gold_rush',
        name: '✨ Gold Rush',
        description: '2+ cartas de rareza GOLD o PLATINUM en las últimas 5 tocadas',
        bonus: { atk: 3, hype: 1 },
        check: (recent) => {
            const last5 = recent.slice(-5);
            const goldCount = last5.filter(c => c.rarity === 'GOLD' || c.rarity === 'PLATINUM').length;
            return goldCount >= 2;
        },
    },
    {
        id: 'event_power',
        name: '🎪 Festival en Vivo',
        description: 'Jugar 2+ cartas de tipo EVENT seguidas',
        bonus: { energy: 1, hype: 1 },
        check: (recent) => {
            if (recent.length < 2) return false;
            const last2 = recent.slice(-2);
            return last2.every(c => c.type === 'EVENT');
        },
    },
    {
        id: 'heavyweight',
        name: '💪 Peso Pesado',
        description: 'La carta actual tiene ATK + DEF mayor a 15',
        bonus: { atk: 2 },
        check: (recent) => {
            if (recent.length === 0) return false;
            const curr = recent[recent.length - 1];
            return (curr.stats?.atk ?? 0) + (curr.stats?.def ?? 0) >= 15;
        },
    },
];

// ════════════════════════════════════════════════════════════
// MOTOR DE EVALUACIÓN
// ════════════════════════════════════════════════════════════

/**
 * Evalúa qué sinergias están activas dado el historial de cartas jugadas
 * @param recentTracks Las últimas ~5 cartas jugadas (para sinergia de streak)
 * @param fullPlaylist Toda la playlist del jugador (para sinergia de cohesión)
 * @returns Las sinergias que se activaron
 */
export function evaluatePlaylistSynergies(
    recentTracks: CardData[],
    fullPlaylist: CardData[]
): PlaylistSynergy[] {
    return PLAYLIST_SYNERGIES.filter(synergy => {
        try {
            return synergy.check(recentTracks, fullPlaylist);
        } catch {
            return false;
        }
    });
}

/**
 * Calcula los bonos totales de las sinergias activas
 */
export function calculateSynergyBonus(
    activeSynergies: PlaylistSynergy[]
): { atk: number; def: number; hype: number; energy: number } {
    return activeSynergies.reduce(
        (acc, syn) => ({
            atk: acc.atk + (syn.bonus.atk ?? 0),
            def: acc.def + (syn.bonus.def ?? 0),
            hype: acc.hype + (syn.bonus.hype ?? 0),
            energy: acc.energy + (syn.bonus.energy ?? 0),
        }),
        { atk: 0, def: 0, hype: 0, energy: 0 }
    );
}

// ════════════════════════════════════════════════════════════
// ANÁLISIS DE CALIDAD DE PLAYLIST
// ════════════════════════════════════════════════════════════

export function analyzePlaylistQuality(playlist: CardData[]) {
    if (playlist.length === 0) {
        return {
            cohesionScore: 0,
            varietyScore: 0,
            powerScore: 0,
            synergyScore: 0,
            genreDistribution: {},
            rarityDistribution: {},
            potentialSynergies: [],
            warnings: ['Playlist vacía'],
            tips: ['Añade canciones para evaluar la calidad de tu setlist'],
        };
    }

    // Distribución de géneros
    const genreDistribution: Record<string, number> = {};
    playlist.forEach(c => {
        const g = c.genre || 'Desconocido';
        genreDistribution[g] = (genreDistribution[g] || 0) + 1;
    });

    // Distribución de rareza
    const rarityDistribution: Record<string, number> = {};
    playlist.forEach(c => {
        rarityDistribution[c.rarity] = (rarityDistribution[c.rarity] || 0) + 1;
    });

    // Cohesión (% del género más común)
    const maxGenreCount = Math.max(...Object.values(genreDistribution));
    const cohesionScore = Math.round((maxGenreCount / playlist.length) * 100);

    // Variedad (cantidad de géneros distintos normalizada)
    const uniqueGenres = Object.keys(genreDistribution).length;
    const varietyScore = Math.min(100, Math.round((uniqueGenres / 6) * 100));

    // Potencia (promedio de stats)
    const avgAtk = playlist.reduce((s, c) => s + (c.stats?.atk ?? 0), 0) / playlist.length;
    const avgDef = playlist.reduce((s, c) => s + (c.stats?.def ?? 0), 0) / playlist.length;
    const avgCost = playlist.reduce((s, c) => s + c.cost, 0) / playlist.length;
    const powerScore = Math.min(100, Math.round(((avgAtk + avgDef) / (avgCost || 1)) * 10));

    // Sinergias potenciales (simular con muestra)
    const sampleTracks = playlist.slice(0, 10);
    const potentialSynergies = PLAYLIST_SYNERGIES.filter(s => {
        try { return s.check(sampleTracks, playlist); } catch { return false; }
    });
    const synergyScore = Math.min(100, potentialSynergies.length * 15);

    // Warnings y tips
    const warnings: string[] = [];
    const tips: string[] = [];

    if (playlist.length < 20) warnings.push('Tu playlist tiene pocas cartas (<20). Considera añadir más.');
    if (cohesionScore < 30) tips.push('Playlist muy ecléctica. Si enfocas un género ganarás sinergias automáticamente.');
    if (cohesionScore > 80) tips.push('Playlist muy coherente. Activas la sinergia "Vibe Check" con facilidad.');
    if (avgCost > 5) warnings.push('Costo promedio alto. Podrías tener problemas de energía.');
    if (potentialSynergies.length === 0) tips.push('Ninguna sinergia activa. Prueba agrupar canciones del mismo álbum.');
    if (rarityDistribution['PLATINUM'] >= 5) tips.push('¡Muchas Platinos! Alta potencia de ataque.');

    return {
        cohesionScore,
        varietyScore,
        powerScore,
        synergyScore,
        genreDistribution,
        rarityDistribution,
        potentialSynergies,
        warnings,
        tips,
    };
}

// ════════════════════════════════════════════════════════════
// SHUFFLE VISIBLE (Fisher-Yates)
// ════════════════════════════════════════════════════════════

export function shufflePlaylist<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Inicializa el estado de setlist para la batalla con shuffle visible.
 * El jugador siempre ve su playlist completa (estrategia),
 * pero el orden de salida es aleatorio.
 */
export function initializeSetlistState(playlist: CardData[], userId: string, username: string) {
    const shuffled = shufflePlaylist(playlist);
    return {
        userId,
        username,
        fullPlaylist: playlist,             // SIEMPRE VISIBLE — para estrategia
        shuffledQueue: shuffled,            // ORDEN REAL — aleatorio
        currentQueueIndex: 0,
        upcomingTracks: shuffled.slice(0, 5), // LAS PRÓXIMAS 5 — visibles
        currentTrack: null,
        pastTracks: [],
        activeSynergies: [],
        sessionStats: {
            totalDamageDealt: 0,
            synergyActivations: 0,
            tracksPlayed: 0,
        },
    };
}

/**
 * Avanza al siguiente track del shuffle y actualiza "upcomingTracks"
 */
export function advanceSetlistQueue(state: ReturnType<typeof initializeSetlistState>) {
    const { shuffledQueue, currentQueueIndex } = state;

    let nextIndex = currentQueueIndex;

    // Si llegamos al final, re-barajar
    if (nextIndex >= shuffledQueue.length) {
        const reshuffled = shufflePlaylist(state.fullPlaylist);
        return {
            ...state,
            shuffledQueue: reshuffled,
            currentQueueIndex: 1,
            currentTrack: reshuffled[0],
            upcomingTracks: reshuffled.slice(1, 6),
            pastTracks: [...state.pastTracks, ...(state.currentTrack ? [state.currentTrack] : [])],
        };
    }

    const nextTrack = shuffledQueue[nextIndex];
    return {
        ...state,
        currentQueueIndex: nextIndex + 1,
        currentTrack: nextTrack,
        upcomingTracks: shuffledQueue.slice(nextIndex + 1, nextIndex + 6),
        pastTracks: [...state.pastTracks, ...(state.currentTrack ? [state.currentTrack] : [])],
        sessionStats: {
            ...state.sessionStats,
            tracksPlayed: state.sessionStats.tracksPlayed + 1,
        },
    };
}
