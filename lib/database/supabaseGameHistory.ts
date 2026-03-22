import { supabase } from '../supabase';
import { GameMatch, PlayerStats, DeckStats, HeadToHeadStats } from '../../types/gameHistory';

/**
 * Guarda el resultado de una partida en el historial
 */
export async function saveGameResult(match: GameMatch) {
    const matchId = match.matchId;

    // 1. Guardar partida en historial global
    const { error: matchError } = await supabase
        .from('game_matches')
        .insert({
            id: matchId,
            mode: match.mode,
            player_a_id: match.playerA.userId,
            player_b_id: match.playerB.userId || null,
            winner_id: match.winnerId || null,
            is_draw: match.isDraw || false,
            started_at: match.startedAt,
            finished_at: match.finishedAt,
            match_data: match
        });

    if (matchError) {
        console.error("Error saving match result:", matchError);
        throw matchError;
    }

    // 2. Actualizar estadísticas del jugador A
    const statsA = await getPlayerStats(match.playerA.userId);
    const updatedStatsA = updateStatsWithMatch(statsA, match, 'A');
    await savePlayerStats(match.playerA.userId, updatedStatsA);

    // 3. Actualizar estadísticas del jugador B si no es BOT
    if (match.playerB.userId) {
        const statsB = await getPlayerStats(match.playerB.userId);
        const updatedStatsB = updateStatsWithMatch(statsB, match, 'B');
        await savePlayerStats(match.playerB.userId, updatedStatsB);
    }

    // 4. Actualizar Head-to-Head si es PVP
    if (match.playerB.userId) {
        const h2hId = [match.playerA.userId, match.playerB.userId].sort().join('_');
        const h2h = await getHeadToHead(match.playerA.userId, match.playerB.userId);
        const updatedH2H = updateH2HWithMatch(h2h, match);
        await saveHeadToHead(h2hId, updatedH2H);
    }
}

/**
 * Obtener historial de partidas de un jugador
 */
export async function getPlayerMatchHistory(userId: string, limit: number = 10): Promise<GameMatch[]> {
    if (!userId || userId === 'local-guest' || userId.length !== 36) {
        return [];
    }

    const { data, error } = await supabase
        .from('game_matches')
        .select('match_data')
        .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
        .order('finished_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching match history:", error.message || error);
        return [];
    }

    return (data || []).map(row => row.match_data as GameMatch);
}

/**
 * Obtener o inicializar estadísticas de jugador
 */
export async function getPlayerStats(userId: string): Promise<PlayerStats> {
    // Si no hay userId válido, devolvemos el placeholder directamente
    if (!userId || userId === 'local-guest' || userId.length !== 36) {
        return getPlaceholderStats(userId || 'local-guest');
    }

    const { data, error } = await supabase
        .from('player_stats')
        .select('stats_data')
        .eq('user_id', userId)
        .single();

    if (data && data.stats_data) {
        return data.stats_data as PlayerStats;
    }

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching player stats:", error.message || error);
    }

    // Inicialización
    return getPlaceholderStats(userId);
}

function getPlaceholderStats(userId: string): PlayerStats {
    return {
        userId,
        username: '...',
        totalMatches: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        vsPlayerWins: 0,
        vsPlayerLosses: 0,
        vsBotWins: 0,
        vsBotLosses: 0,
        averageGameDuration: 0,
        averageTurns: 0,
        averageDamageDealt: 0,
        averageDamageTaken: 0,
        longestWinStreak: 0,
        currentWinStreak: 0,
        lastMatchAt: new Date().toISOString()
    };
}

async function savePlayerStats(userId: string, stats: PlayerStats) {
    const { error } = await supabase
        .from('player_stats')
        .upsert({ user_id: userId, stats_data: stats });
    if (error) console.error("Error saving player stats:", error);
}

/**
 * Obtener Head-to-Head histórico
 */
export async function getHeadToHead(user1: string, user2: string): Promise<HeadToHeadStats | null> {
    const h2hId = [user1, user2].sort().join('_');
    const { data, error } = await supabase
        .from('head_to_head_stats')
        .select('h2h_data')
        .eq('id', h2hId)
        .single();

    if (data && data.h2h_data) {
        return data.h2h_data as HeadToHeadStats;
    }
    return null;
}

async function saveHeadToHead(h2hId: string, h2h: HeadToHeadStats) {
    const { error } = await supabase
        .from('head_to_head_stats')
        .upsert({ id: h2hId, h2h_data: h2h });
    if (error) console.error("Error saving head to head stats:", error);
}

// ── Helpers de cálculo (Internos) ───────────────────────────────────────────

function updateStatsWithMatch(current: PlayerStats, match: GameMatch, side: 'A' | 'B'): PlayerStats {
    const isWinner = match.winnerId === (side === 'A' ? match.playerA.userId : match.playerB.userId);
    const playerStats = side === 'A' ? match.stats.playerAStats : match.stats.playerBStats;

    const newState = { ...current };
    newState.totalMatches++;
    if (isWinner) {
        newState.totalWins++;
        newState.currentWinStreak++;
        if (newState.currentWinStreak > newState.longestWinStreak) {
            newState.longestWinStreak = newState.currentWinStreak;
        }
        if (match.playerB.userId) newState.vsPlayerWins++; else newState.vsBotWins++;
    } else {
        newState.totalLosses++;
        newState.currentWinStreak = 0;
        if (match.playerB.userId) newState.vsPlayerLosses++; else newState.vsBotLosses++;
    }

    newState.winRate = (newState.totalWins / newState.totalMatches) * 100;
    newState.lastMatchAt = match.finishedAt;

    // Promedios (Simplificado: media móvil con peso acumulado)
    const n = newState.totalMatches;
    newState.averageTurns = (newState.averageTurns * (n - 1) + match.stats.turns) / n;
    newState.averageDamageDealt = (newState.averageDamageDealt * (n - 1) + playerStats.damageDealt) / n;

    return newState;
}

function updateH2HWithMatch(current: HeadToHeadStats | null, match: GameMatch): HeadToHeadStats {
    if (!current) {
        // Inicializar H2H
        return {
            playerA: { userId: match.playerA.userId, username: match.playerA.username },
            playerB: { userId: match.playerB.userId!, username: match.playerB.username },
            playerAWins: match.winnerId === match.playerA.userId ? 1 : 0,
            playerBWins: match.winnerId === match.playerB.userId ? 1 : 0,
            draws: match.isDraw ? 1 : 0,
            totalMatches: 1,
            lastMatch: match
        };
    }

    const newState = { ...current };
    newState.totalMatches++;
    if (match.isDraw) newState.draws++;
    else if (match.winnerId === match.playerA.userId) newState.playerAWins++;
    else if (match.winnerId === match.playerB.userId) newState.playerBWins++;

    newState.lastMatch = match;
    return newState;
}
