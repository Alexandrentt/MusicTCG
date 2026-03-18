// lib/database/firebaseGameHistory.ts
import { ref, set, onValue, update, push, get, child, remove, off, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb } from '../firebase';
import { GameMatch, PlayerStats, DeckStats, HeadToHeadStats } from '../../types/gameHistory';

/**
 * Guarda el resultado de una partida en el historial
 */
export async function saveGameResult(match: GameMatch) {
    const matchId = match.matchId;
    const updates: any = {};

    // 1. Guardar partida en historial global y por jugador
    updates[`game_history/matches/${matchId}`] = match;
    updates[`game_history/player_matches/${match.playerA.userId}/${matchId}`] = true;
    if (match.playerB.userId) {
        updates[`game_history/player_matches/${match.playerB.userId}/${matchId}`] = true;
    }

    // 2. Actualizar estadísticas del jugador A
    const statsA = await getPlayerStats(match.playerA.userId);
    const updatedStatsA = updateStatsWithMatch(statsA, match, 'A');
    updates[`users/${match.playerA.userId}/stats`] = updatedStatsA;

    // 3. Actualizar estadísticas del jugador B si no es BOT
    if (match.playerB.userId) {
        const statsB = await getPlayerStats(match.playerB.userId);
        const updatedStatsB = updateStatsWithMatch(statsB, match, 'B');
        updates[`users/${match.playerB.userId}/stats`] = updatedStatsB;
    }

    // 4. Actualizar Head-to-Head si es PVP
    if (match.playerB.userId) {
        const h2hId = [match.playerA.userId, match.playerB.userId].sort().join('_');
        const h2h = await getHeadToHead(match.playerA.userId, match.playerB.userId);
        const updatedH2H = updateH2HWithMatch(h2h, match);
        updates[`game_history/head_to_head/${h2hId}`] = updatedH2H;
    }

    await update(ref(rtdb), updates);
}

/**
 * Obtener historial de partidas de un jugador
 */
export async function getPlayerMatchHistory(userId: string, limit: number = 10): Promise<GameMatch[]> {
    const playerMatchesRef = query(ref(rtdb, `game_history/player_matches/${userId}`), limitToLast(limit));
    const snapshot = await get(playerMatchesRef);

    if (!snapshot.exists()) return [];

    const matchIds = Object.keys(snapshot.val());
    const matches = await Promise.all(matchIds.map(async (id) => {
        const s = await get(ref(rtdb, `game_history/matches/${id}`));
        return s.val();
    }));

    return matches.reverse(); // Más recientes primero
}

/**
 * Obtener o inicializar estadísticas de jugador
 */
export async function getPlayerStats(userId: string): Promise<PlayerStats> {
    const snapshot = await get(ref(rtdb, `users/${userId}/stats`));
    if (snapshot.exists()) return snapshot.val();

    // Inicialización (Placeholder completo por ahora)
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

/**
 * Obtener Head-to-Head histórico
 */
export async function getHeadToHead(user1: string, user2: string): Promise<HeadToHeadStats | null> {
    const h2hId = [user1, user2].sort().join('_');
    const snapshot = await get(ref(rtdb, `game_history/head_to_head/${h2hId}`));
    return snapshot.val() || null;
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
