import { MasterCardTemplate } from "./types";

export type CardState = 'UNTAPPED' | 'TAPPED';

export interface PlaylistCard {
    id: string;                    // ID único de la carta en juego
    trackId: string;               // ID de la canción (para agrupar)
    cardData: MasterCardTemplate;  // Datos de la carta

    // Estado de juego
    currentDef: number;            // Defensa actual (con daño)
    state: CardState;              // UNTAPPED | TAPPED
    position?: number;             // Posición en la lane

    // Stacking
    stackGroupId?: string;         // ID del grupo de álbum
    isStackLeader?: boolean;       // Es la carta superior del stack
}

export interface PlaylistStack {
    stackId: string;
    albumName: string;
    genre: string;
    cards: PlaylistCard[];         // Cartas agrupadas (máx 10 visibles)
    totalCount: number;            // Total en este stack
    bonusActive: boolean;          // ¿Bonus de sinergia activo?
    bonus: {
        atkBonus: number;            // +1 ATK por cada 3+ cartas
        defBonus: number;            // +1 DEF por cada 3+ cartas
    };
    themeColor: string;            // Color del álbum
}

export interface Playlist {
    playerPlaylist: PlaylistStack[];
    rivalPlaylist: PlaylistStack[];
}
