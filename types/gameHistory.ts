// types/gameHistory.ts
import { BattleMode, BotDifficulty } from './multiplayer';

export interface GameMatch {
    matchId: string;
    mode: BattleMode;
    status: 'FINISHED' | 'ABANDONED' | 'DRAW';

    // Jugadores
    playerA: {
        userId: string;
        username: string;
        deckId: string;
        deckName: string;
        avatar?: string;
    };
    playerB: {
        userId?: string;
        username: string;
        deckId?: string;
        deckName?: string;
        botDifficulty?: BotDifficulty;
        avatar?: string;
    };

    // Resultado
    winnerId: string;
    loserIds?: string[];
    isDraw: boolean;
    concededBy?: string;

    // Estadísticas de la partida
    stats: {
        duration: number; // milisegundos
        turns: number;

        playerAStats: {
            finalReputation: number;
            finalHype: number;
            cardsPlayed: number;
            cardsDestroyed: number;
            damageDealt: number;
            damageTaken: number;
            energySacrificed: number;
            totalEnergy: number;
        };

        playerBStats: {
            finalReputation: number;
            finalHype: number;
            cardsPlayed: number;
            cardsDestroyed: number;
            damageDealt: number;
            damageTaken: number;
            energySacrificed: number;
            totalEnergy: number;
        };

        winCondition: 'KNOCKOUT' | 'HYPE_WIN' | 'FORGOTTEN' | 'CONCEDE' | 'DRAW';
    };

    // Timeline
    createdAt: string;
    startedAt: string;
    finishedAt: string;
}

export interface PlayerStats {
    userId: string;
    username: string;

    // Globales
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    winRate: number; // porcentaje

    // Por modo
    vsPlayerWins: number;
    vsPlayerLosses: number;
    vsBotWins: number;
    vsBotLosses: number;

    // Por enemigo
    winsByOpponent?: Record<string, number>; // opponentId -> wins
    lossByOpponent?: Record<string, number>; // opponentId -> losses

    // Por mazo
    winsByDeck?: Record<string, number>; // deckId -> wins
    lossByDeck?: Record<string, number>; // deckId -> losses

    // Promedio de estadísticas
    averageGameDuration: number;
    averageTurns: number;
    averageDamageDealt: number;
    averageDamageTaken: number;

    // Récords
    longestWinStreak: number;
    currentWinStreak: number;

    lastMatchAt: string;
}

export interface DeckStats {
    deckId: string;
    deckName: string;

    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;

    matchupStats: Record<string, { wins: number; losses: number }>; // opponentDeckId -> stats

    lastPlayedAt: string;
}

export interface HeadToHeadStats {
    playerA: {
        userId: string;
        username: string;
    };
    playerB: {
        userId: string;
        username: string;
    };

    playerAWins: number;
    playerBWins: number;
    draws: number;
    totalMatches: number;

    lastMatch: GameMatch;
}
