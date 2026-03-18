// types/multiplayer.ts
import { GameState } from './types';

export enum BattleMode {
    PVP_DIRECT = 'PVP_DIRECT',      // Reto amigo
    PVP_CHALLENGE = 'PVP_CHALLENGE', // Reto código
    VS_BOT = 'VS_BOT',               // Contra IA
}

export enum BotDifficulty {
    EASY = 'EASY',           // IA burra
    NORMAL = 'NORMAL',       // IA decente
    HARD = 'HARD',           // IA competente
    IMPOSSIBLE = 'IMPOSSIBLE', // IA rotísima
}

export interface BattleRoom {
    roomId: string;
    mode: BattleMode;
    playerA: {
        userId: string;
        username: string;
        deckId: string;
        deckName?: string;
        avatar?: string;
    };
    playerB: {
        userId?: string;        // NULL si es BOT
        username: string;       // "Bot - Hard"
        deckId?: string;        // NULL si es BOT
        deckName?: string;
        botDifficulty?: BotDifficulty;
        avatar?: string;
    };
    gameState: GameState;
    status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
    createdAt: Date;
    winnerId?: string;
    concededBy?: string;
}

export interface Challenge {
    challengeId: string;
    fromUserId: string;
    toUserId: string;
    deckId: string;
    expiresAt: Date;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
    roomId?: string; // Cuando se acepta
}
