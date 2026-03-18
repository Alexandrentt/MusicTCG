/**
 * rankingSystem.ts
 *
 * Sistema de Ranking + Leveling para MusicTCG (estilo Magic Arena)
 *
 * ARQUITECTURA:
 *  - RankTier: Los 6 rangos del juego (BRONZE → MYTHIC)
 *  - PlayerRank: Estado de ranking del jugador (tier, rank 1-4, puntos, winstreak)
 *  - PlayerLevel: Sistema de niveles parallelo al ranking (nivel 1-100, XP)
 *  - awardRankedVictory(): Sube puntos, gestiona rankup y tierup
 *  - applyRankedLoss(): Quita puntos (benevolente: Bronze/Silver NO pierden)
 *  - awardXP(): Añade experiencia y gestiona levelups
 *  - getPlayerStats(): Snapshot unificado para la UI
 *
 * POR QUÉ SEPARADO DEL RANKING:
 *  El nivel (XP) sube tanto en casual como en ranked, mientras que el
 *  ranking solo avanza en partidas ranked. Esto permite que jugadores
 *  casuales igual progresen.
 *
 * SEGURIDAD:
 *  Bronze y Silver tienen tier-protection (no se puede bajar de tier).
 *  Gold+ puede bajar de tier tras acumular -5 puntos (con colchón).
 */

// ═══════════════════════════════════════════
// ENUMS & TIPOS BASE
// ═══════════════════════════════════════════

export enum GameMode {
    CASUAL = 'CASUAL',
    RANKED = 'RANKED',
}

export enum RankTier {
    BRONZE = 'BRONZE',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    PLATINUM = 'PLATINUM',
    DIAMOND = 'DIAMOND',
    MYTHIC = 'MYTHIC',
}

export interface PlayerRank {
    userId: string;
    tier: RankTier;
    /** 1 = peor, 4 = mejor dentro del tier */
    rank: number;
    /** 0–100 puntos dentro del rank actual */
    points: number;
    seasonRank: RankTier;
    allTimeHighest: RankTier;
    rankedWins: number;
    rankedLosses: number;
    winStreak: number;
    bestWinStreak: number;
    lastRankedMatch?: Date;
    seasonStart: Date;
}

export interface PlayerLevel {
    userId: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    totalXpEarned: number;
}

export interface RankingStats {
    tier: RankTier;
    rank: number;
    points: number;
    winRate: number;
    totalGames: number;
    winStreak: number;
    bestWinStreak: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    seasonBest: RankTier;
    allTimeBest: RankTier;
}

// ═══════════════════════════════════════════
// CONFIGURACIÓN DEL RANKING
// ═══════════════════════════════════════════

export const TIER_ORDER: RankTier[] = [
    RankTier.BRONZE,
    RankTier.SILVER,
    RankTier.GOLD,
    RankTier.PLATINUM,
    RankTier.DIAMOND,
    RankTier.MYTHIC,
];

/** Tiers protegidos: nunca pueden bajar de tier */
const PROTECTED_TIERS: RankTier[] = [RankTier.BRONZE, RankTier.SILVER];

/** Puntos necesarios para pasar del rank N al rank N+1 dentro del tier */
const POINTS_PER_RANK = 25;

/** Puntos base por victoria */
const WIN_POINTS = 25;

/** Puntos perdidos por derrota en tiers no protegidos */
const LOSS_POINTS = -5;

export const WIN_STREAK_BONUS: Record<number, number> = {
    3: 5,
    5: 10,
    10: 25,
};

export const TIER_UP_REWARDS: Partial<Record<RankTier, { regalias: number; wildcardRarity?: string }>> = {
    [RankTier.SILVER]: { regalias: 500 },
    [RankTier.GOLD]: { regalias: 1000, wildcardRarity: 'SILVER' },
    [RankTier.PLATINUM]: { regalias: 2000, wildcardRarity: 'GOLD' },
    [RankTier.DIAMOND]: { regalias: 3000, wildcardRarity: 'GOLD' },
    [RankTier.MYTHIC]: { regalias: 5000, wildcardRarity: 'PLATINUM' },
};

// ═══════════════════════════════════════════
// SISTEMA DE XP / NIVELES
// ═══════════════════════════════════════════

export const XP_PER_ACTION = {
    CASUAL_WIN: 50,
    CASUAL_LOSS: 25,
    RANKED_WIN: 75,
    RANKED_LOSS: 40,
    DAILY_CHALLENGE: 100,
    SEASON_CHALLENGE: 250,
    FIRST_WIN_OF_DAY: 100,
} as const;

export type XPSource = keyof typeof XP_PER_ACTION;

/**
 * XP necesaria para pasar de `level` a `level + 1`.
 * Fórmula: 1000 * level^1.15 (redondeado a decenas)
 */
export function xpForLevel(level: number): number {
    return Math.round((1000 * Math.pow(level, 1.15)) / 10) * 10;
}

export const LEVEL_REWARDS: Record<number, { regalias?: number; wildcardRarity?: string; cosmetic?: string }> = {
    5: { regalias: 300 },
    10: { regalias: 500, wildcardRarity: 'SILVER', cosmetic: 'BORDER_SILVER' },
    20: { regalias: 1000, wildcardRarity: 'GOLD', cosmetic: 'AVATAR_GOLD' },
    30: { regalias: 1500 },
    50: { regalias: 2500, wildcardRarity: 'PLATINUM', cosmetic: 'SLEEVE_SPECIAL' },
    75: { regalias: 3500, wildcardRarity: 'PLATINUM' },
    100: { regalias: 5000, wildcardRarity: 'PLATINUM', cosmetic: 'MYTHIC_BORDER' },
};

// ═══════════════════════════════════════════
// RANK ENGINE (puro, sin I/O)
// ═══════════════════════════════════════════

export interface VictoryResult {
    pointsGained: number;
    rankUp: boolean;
    tierUp: boolean;
    newTier: RankTier;
    newRank: number;
    newPoints: number;
    reward?: { regalias: number; wildcardRarity?: string };
    streakBonus: number;
}

/**
 * Calcula el nuevo estado de ranking tras una victoria.
 * @returns resultado + nuevo PlayerRank inmutable
 */
export function computeVictory(
    current: PlayerRank,
): { result: VictoryResult; updated: PlayerRank } {
    const updated: PlayerRank = { ...current };
    updated.rankedWins += 1;
    updated.winStreak += 1;
    updated.bestWinStreak = Math.max(updated.bestWinStreak, updated.winStreak);
    updated.lastRankedMatch = new Date();

    // Bonus por winstreak
    let streakBonus = 0;
    for (const [threshold, bonus] of Object.entries(WIN_STREAK_BONUS)
        .map(([k, v]) => [Number(k), v] as [number, number])
        .sort((a, b) => b[0] - a[0])) {
        if (updated.winStreak >= threshold) { streakBonus = bonus; break; }
    }

    let pointsGained = WIN_POINTS + streakBonus;
    updated.points += pointsGained;

    let rankUp = false;
    let tierUp = false;
    let reward: VictoryResult['reward'] | undefined;

    // Subir de rank/tier mientras tenga puntos suficientes
    while (updated.points >= POINTS_PER_RANK) {
        updated.points -= POINTS_PER_RANK;

        if (updated.rank < 4) {
            // Sube dentro del mismo tier
            updated.rank += 1;
            rankUp = true;
        } else {
            // Intenta subir de tier
            const nextTierIdx = TIER_ORDER.indexOf(updated.tier) + 1;
            if (nextTierIdx < TIER_ORDER.length) {
                updated.tier = TIER_ORDER[nextTierIdx];
                updated.rank = 4; // Empieza en el rank más bajo del nuevo tier
                updated.points = 0;
                tierUp = true;
                rankUp = true;
                reward = TIER_UP_REWARDS[updated.tier];

                // Actualizar mejor rango de la season
                const prevSeasonIdx = TIER_ORDER.indexOf(updated.seasonRank);
                const newTierIdx = TIER_ORDER.indexOf(updated.tier);
                if (newTierIdx > prevSeasonIdx) updated.seasonRank = updated.tier;
                if (newTierIdx > TIER_ORDER.indexOf(updated.allTimeHighest)) {
                    updated.allTimeHighest = updated.tier;
                }
            } else {
                // Ya está en MYTHIC máximo
                updated.points = POINTS_PER_RANK - 1; // Techo en 24
            }
        }
    }

    return {
        result: {
            pointsGained,
            rankUp,
            tierUp,
            newTier: updated.tier,
            newRank: updated.rank,
            newPoints: updated.points,
            streakBonus,
            reward,
        },
        updated,
    };
}

export interface LossResult {
    pointsLost: number;
    demoted: boolean;
    newTier: RankTier;
    newRank: number;
    newPoints: number;
}

/**
 * Calcula el nuevo estado de ranking tras una derrota.
 * Bronze y Silver son inmunes a pérdida de puntos.
 */
export function computeLoss(
    current: PlayerRank,
): { result: LossResult; updated: PlayerRank } {
    const updated: PlayerRank = { ...current };
    updated.rankedLosses += 1;
    updated.winStreak = 0;
    updated.lastRankedMatch = new Date();

    // Tiers protegidos: sin pérdida de puntos
    if (PROTECTED_TIERS.includes(updated.tier)) {
        return {
            result: { pointsLost: 0, demoted: false, newTier: updated.tier, newRank: updated.rank, newPoints: updated.points },
            updated,
        };
    }

    updated.points += LOSS_POINTS; // LOSS_POINTS es negativo

    let demoted = false;

    if (updated.points < 0) {
        // Intentar bajar de rank
        if (updated.rank > 4) {
            updated.rank -= 1;
            updated.points = POINTS_PER_RANK - 1;
        } else if (updated.rank === 4) {
            // Intentar bajar de tier
            const prevTierIdx = TIER_ORDER.indexOf(updated.tier) - 1;
            if (prevTierIdx >= TIER_ORDER.indexOf(RankTier.GOLD)) {
                // Solo puede bajar hasta GOLD (no puede bajar a los tiers protegidos)
                updated.tier = TIER_ORDER[prevTierIdx];
                updated.rank = 1; // Empieza en el rank más alto del tier anterior
                updated.points = Math.floor(POINTS_PER_RANK / 2); // 12 puntos de colchón
                demoted = true;
            } else {
                updated.points = 0; // Piso en 0
            }
        } else {
            updated.points = 0;
        }
    }

    return {
        result: {
            pointsLost: Math.abs(LOSS_POINTS),
            demoted,
            newTier: updated.tier,
            newRank: updated.rank,
            newPoints: updated.points,
        },
        updated,
    };
}

// ═══════════════════════════════════════════
// LEVEL ENGINE (puro, sin I/O)
// ═══════════════════════════════════════════

export interface LevelUpResult {
    xpGained: number;
    levelsGained: number;
    newLevel: number;
    newXp: number;
    rewards: Array<{ level: number; reward: (typeof LEVEL_REWARDS)[number] }>;
}

export function computeXPGain(
    current: PlayerLevel,
    source: XPSource,
    multiplier: number = 1,
): { result: LevelUpResult; updated: PlayerLevel } {
    const updated: PlayerLevel = { ...current };
    const xpGained = Math.floor(XP_PER_ACTION[source] * multiplier);
    updated.xp += xpGained;
    updated.totalXpEarned += xpGained;

    const rewards: LevelUpResult['rewards'] = [];
    let levelsGained = 0;

    while (updated.level < 100) {
        const needed = xpForLevel(updated.level + 1);
        if (updated.xp < needed) break;
        updated.xp -= needed;
        updated.level += 1;
        levelsGained += 1;
        if (LEVEL_REWARDS[updated.level]) {
            rewards.push({ level: updated.level, reward: LEVEL_REWARDS[updated.level] });
        }
    }

    updated.xpToNextLevel = updated.level < 100 ? xpForLevel(updated.level + 1) : 0;

    return {
        result: { xpGained, levelsGained, newLevel: updated.level, newXp: updated.xp, rewards },
        updated,
    };
}

// ═══════════════════════════════════════════
// DEFAULT FACTORIES
// ═══════════════════════════════════════════

export function createDefaultRank(userId: string): PlayerRank {
    return {
        userId,
        tier: RankTier.BRONZE,
        rank: 4,
        points: 0,
        seasonRank: RankTier.BRONZE,
        allTimeHighest: RankTier.BRONZE,
        rankedWins: 0,
        rankedLosses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        seasonStart: new Date(),
    };
}

export function createDefaultLevel(userId: string): PlayerLevel {
    return {
        userId,
        level: 1,
        xp: 0,
        xpToNextLevel: xpForLevel(2),
        totalXpEarned: 0,
    };
}

// ═══════════════════════════════════════════
// HELPER: STATS UNIFICADAS PARA LA UI
// ═══════════════════════════════════════════

export function buildRankingStats(rank: PlayerRank, level: PlayerLevel): RankingStats {
    const totalGames = rank.rankedWins + rank.rankedLosses;
    return {
        tier: rank.tier,
        rank: rank.rank,
        points: rank.points,
        winRate: totalGames > 0 ? Math.round(((rank.rankedWins / totalGames) * 100) * 10) / 10 : 0,
        totalGames,
        winStreak: rank.winStreak,
        bestWinStreak: rank.bestWinStreak,
        level: level.level,
        xp: level.xp,
        xpToNextLevel: level.xpToNextLevel,
        seasonBest: rank.seasonRank,
        allTimeBest: rank.allTimeHighest,
    };
}

// ═══════════════════════════════════════════
// VISUAL HELPERS
// ═══════════════════════════════════════════

export const TIER_CONFIG: Record<RankTier, {
    label: string;
    emoji: string;
    gradient: string;
    color: string;
    borderColor: string;
}> = {
    [RankTier.BRONZE]: { label: 'Bronce', emoji: '🥉', gradient: 'from-orange-900 to-orange-700', color: 'text-orange-400', borderColor: 'border-orange-600/40' },
    [RankTier.SILVER]: { label: 'Plata', emoji: '🥈', gradient: 'from-slate-500 to-slate-700', color: 'text-slate-300', borderColor: 'border-slate-400/40' },
    [RankTier.GOLD]: { label: 'Oro', emoji: '🥇', gradient: 'from-yellow-600 to-yellow-800', color: 'text-yellow-400', borderColor: 'border-yellow-500/50' },
    [RankTier.PLATINUM]: { label: 'Platino', emoji: '💎', gradient: 'from-cyan-500 to-blue-700', color: 'text-cyan-300', borderColor: 'border-cyan-400/50' },
    [RankTier.DIAMOND]: { label: 'Diamante', emoji: '🔷', gradient: 'from-purple-500 to-blue-600', color: 'text-purple-300', borderColor: 'border-purple-400/50' },
    [RankTier.MYTHIC]: { label: 'Mítico', emoji: '👑', gradient: 'from-pink-600 to-purple-700', color: 'text-pink-300', borderColor: 'border-pink-500/60' },
};
