// types/playlistCombat.ts
// Sistema de Playlist Combat — "Tu Playlist Cobra Vida"
// Todos los tipos para el sistema de setlist como arma de batalla

import { CardData } from '@/lib/engine/generator';

// ════════════════════════════════════════════════════════════
// TIPOS BASE
// ════════════════════════════════════════════════════════════

export type PlaylistSynergyBonus = {
    atk?: number;
    def?: number;
    hype?: number;
    energy?: number;
};

export interface PlaylistSynergy {
    id: string;
    name: string;
    description: string;
    bonus: PlaylistSynergyBonus;
    // Función de evaluación (se llama con las cartas recientes de la ronda)
    check: (recentTracks: CardData[], fullPlaylist: CardData[]) => boolean;
}

// ════════════════════════════════════════════════════════════
// HABILIDADES MUSICALES (Los "keywords" de Setlist)
// ════════════════════════════════════════════════════════════

export type MusicalKeyword =
    | 'drop'          // +3 ATK durante 1 turno al entrar
    | 'bridge'        // La próxima carta recibe +1 DEF
    | 'crescendo'     // Gana +1 ATK por cada turno viva
    | 'breakdown'     // Daña todas las cartas giradas del rival
    | 'chorus'        // Su efecto puede repetirse en el mismo turno
    | 'featuring'     // +2 ATK si hay otra carta del mismo artista en mesa
    | 'live'          // Cuesta -1 energía para invocar
    | 'remix'         // Puedes reordenar tus próximas 3 cartas de la playlist
    | 'mashup'        // La próxima carta que toque suma ATK/DEF de esta
    | 'loop'          // El efecto se repite en el siguiente turno también
    | 'acoustic'      // No puede ser objetivo hasta que ataque primero (Stealth)
    | 'sample'        // Copia +1 ATK o DEF de otra de tus cartas en juego
    | 'outro'         // Al morir, inflige 2 de daño al rival
    | 'bass_boost'    // ATK +2 pero DEF -1
    | 'falsetto'      // ATK -1 pero DEF +2 (evasiva)
    | 'autotune'      // Puede intercambiar ATK y DEF una vez por turno
    | 'skit'          // Al entrar, miras las próximas 2 cartas de tu playlist
    | 'instrumental'  // Inmune a efectos de Silencio
    | 'radio_edit'    // Cuesta -1 energía (versión rápida)
    | 'encore';       // Puedes volver a jugarla si está en el archivo (una vez por juego)

export interface MusicalAbility {
    keyword: MusicalKeyword;
    description: string;
    flavorText: string;
}

// ════════════════════════════════════════════════════════════
// SETLIST / PLAYLIST DECK
// ════════════════════════════════════════════════════════════

export interface PlaylistTrack {
    cardId: string;
    position: number;   // Orden original en la playlist
    addedAt: number;    // Timestamp
}

export interface PlaylistDeck {
    id: string;
    userId: string;
    name: string;
    description: string;
    tracks: PlaylistTrack[];

    // Metadatos calculados
    genreDistribution: Record<string, number>; // { Rock: 12, Pop: 8 }
    avgCost: number;
    avgAtk: number;
    avgDef: number;
    totalCards: number;

    coverArt?: string;
    createdAt: number;
    updatedAt: number;
}

// ════════════════════════════════════════════════════════════
// ESTADO DE BATALLA (SHUFFLE VISIBLE)
// ════════════════════════════════════════════════════════════

export interface PlayerSetlistState {
    userId: string;
    username: string;

    // La playlist completa (SIEMPRE VISIBLE para el propietario)
    fullPlaylist: CardData[];

    // El orden barajado (LO QUE EN REALIDAD SUCEDE)
    shuffledQueue: CardData[];
    currentQueueIndex: number;

    // Las próximas 5 cartas (VISIBLE para ambos jugadores)
    upcomingTracks: CardData[];

    // Carta actualmente "tocando" (en tablero/atacando)
    currentTrack: CardData | null;

    // Cartas que ya tocaron (historial de la batalla)
    pastTracks: CardData[];

    // Sinergias activas este turno
    activeSynergies: PlaylistSynergy[];

    // Stats de la sesión
    sessionStats: {
        totalDamageDealt: number;
        synergyActivations: number;
        tracksPlayed: number;
    };
}

export interface PlaylistBattleState {
    matchId: string;
    turnNumber: number;

    playerA: PlayerSetlistState;
    playerB: PlayerSetlistState;

    // Registro de combate turno a turno
    battleLog: BattleLogEntry[];
}

export interface BattleLogEntry {
    turn: number;
    playerATrack: { name: string; artist: string; atk: number; def: number };
    playerBTrack: { name: string; artist: string; atk: number; def: number };
    result: 'A_WINS' | 'B_WINS' | 'DRAW';
    damageToA: number;
    damageToB: number;
    synergyFired?: string;
}

// ════════════════════════════════════════════════════════════
// ANÁLISIS DE CALIDAD DE PLAYLIST
// ════════════════════════════════════════════════════════════

export interface PlaylistQualityReport {
    cohesionScore: number;     // 0-100: ¿Qué tan consistente es?
    varietyScore: number;      // 0-100: ¿Qué tan variada?
    powerScore: number;        // 0-100: ¿Qué tan poderosa?
    synergyScore: number;      // 0-100: ¿Cuántas sinergias activa?

    genreDistribution: Record<string, number>;
    rarityDistribution: Record<string, number>;

    potentialSynergies: PlaylistSynergy[];
    warnings: string[];
    tips: string[];
}
