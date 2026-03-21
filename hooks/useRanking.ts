'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { XPSource, buildRankingStats, RankingStats } from '@/lib/engine/rankingSystem';
import { useCallback, useMemo } from 'react';
import { audioEngine } from '@/lib/engine/audioEngine';

/**
 * useRanking Hook
 * 
 * Centraliza la lógica de actualización de rango y experiencia.
 * Dispara sonidos automáticos al subir de nivel o rango.
 */
export function useRanking() {
    const { rank, level, updateRank, updateXP } = usePlayerStore();

    const stats: RankingStats = useMemo(() => buildRankingStats(rank, level), [rank, level]);

    const awardWin = useCallback(() => {
        const result = updateRank(true);

        // Audio Feedback
        if (result.tierUp) {
            audioEngine.playSFX('TIER_UP');
        } else if (result.rankUp) {
            audioEngine.playSFX('RANK_UP');
        } else {
            audioEngine.playSFX('VICTORY');
        }

        // XP Gain (Ranked Win)
        updateXP('RANKED_WIN');

        return result;
    }, [updateRank, updateXP]);

    const awardLoss = useCallback(() => {
        const result = updateRank(false);

        // Audio Feedback
        audioEngine.playSFX('DEFEAT');

        // XP Gain (Ranked Loss - even if you lose you get pittance)
        updateXP('RANKED_LOSS');

        return result;
    }, [updateRank, updateXP]);

    const grantXP = useCallback((source: XPSource, multiplier: number = 1) => {
        const result = updateXP(source, multiplier);

        if (result.levelsGained > 0) {
            audioEngine.playSFX('LEVEL_UP');
        }

        return result;
    }, [updateXP]);

    return {
        stats,
        rank,
        level,
        awardWin,
        awardLoss,
        grantXP,
        tier: rank.tier,
        lvl: level.level
    };
}
