// lib/database/supabaseSync.ts
// ─────────────────────────────────────────────────────────────────────────
// Servicio REAL de sincronización con Supabase.
// Reemplaza todos los placeholders con operaciones reales.
// ─────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabase';
import { CardData } from '../engine/generator';

// ── Tipos internos ────────────────────────────────────────────────────────

export interface PlayerStatsRow {
    total_matches: number;
    total_wins: number;
    total_losses: number;
    vs_bot_wins: number;
    vs_bot_losses: number;
    win_streak: number;
    best_streak: number;
    regalias: number;
    wildcards: { BRONZE: number; SILVER: number; GOLD: number; PLATINUM: number };
    last_free_pack: string | null;
}

export interface InventoryRow {
    card_id: string;
    card_data: CardData;
    count: number;
    obtained_at: string;
}

// ── Obtener usuario actual ────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
}

// ── INVENTARIO ───────────────────────────────────────────────────────────

/**
 * Retorna el inventario completo del usuario desde Supabase.
 */
export async function fetchInventory(userId: string): Promise<InventoryRow[]> {
    const { data, error } = await supabase
        .from('player_inventory')
        .select('card_id, card_data, count, obtained_at')
        .eq('user_id', userId)
        .order('obtained_at', { ascending: false });

    if (error) {
        console.error('[Supabase] fetchInventory error:', error);
        return [];
    }
    return (data || []) as InventoryRow[];
}

/**
 * Añade una o varias copias de una carta.
 */
export async function addCardToInventory(
    userId: string,
    card: CardData,
    count: number = 1
): Promise<boolean> {
    const { error } = await supabase.rpc('upsert_card', {
        p_user_id: userId,
        p_card_id: card.id,
        p_card_data: card,
        p_add_count: count,
    });

    if (error) {
        console.error('[Supabase] addCardToInventory error:', error);
        return false;
    }
    return true;
}

/**
 * Elimina una copia de una carta (moler). Si llega a 0, elimina el registro.
 */
export async function removeCardFromInventory(
    userId: string,
    cardId: string
): Promise<boolean> {
    // Obtener la cantidad actual
    const { data, error: fetchError } = await supabase
        .from('player_inventory')
        .select('count')
        .eq('user_id', userId)
        .eq('card_id', cardId)
        .single();

    if (fetchError || !data) return false;

    if (data.count <= 1) {
        // Eliminar registro
        const { error } = await supabase
            .from('player_inventory')
            .delete()
            .eq('user_id', userId)
            .eq('card_id', cardId);
        if (error) { console.error('[Supabase] removeCard delete error:', error); return false; }
    } else {
        // Decrementar
        const { error } = await supabase
            .from('player_inventory')
            .update({ count: data.count - 1 })
            .eq('user_id', userId)
            .eq('card_id', cardId);
        if (error) { console.error('[Supabase] removeCard decrement error:', error); return false; }
    }
    return true;
}

// ── MAZOS ────────────────────────────────────────────────────────────────

export interface DeckRow {
    deck_id: string;
    name: string;
    cards: Record<string, number>;
    cover_art?: string;
    updated_at: string;
}

export async function fetchDecks(userId: string): Promise<DeckRow[]> {
    const { data, error } = await supabase
        .from('player_decks')
        .select('deck_id, name, cards, cover_art, updated_at')
        .eq('user_id', userId);

    if (error) { console.error('[Supabase] fetchDecks error:', error); return []; }
    return (data || []) as DeckRow[];
}

export async function saveDeck(
    userId: string,
    deckId: string,
    name: string,
    cards: Record<string, number>,
    coverArt?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('player_decks')
        .upsert({
            user_id: userId,
            deck_id: deckId,
            name,
            cards,
            cover_art: coverArt,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,deck_id' });

    if (error) { console.error('[Supabase] saveDeck error:', error); return false; }
    return true;
}

export async function deleteDeck(userId: string, deckId: string): Promise<boolean> {
    const { error } = await supabase
        .from('player_decks')
        .delete()
        .eq('user_id', userId)
        .eq('deck_id', deckId);

    if (error) { console.error('[Supabase] deleteDeck error:', error); return false; }
    return true;
}

// ── ESTADÍSTICAS ────────────────────────────────────────────────────────

export async function fetchStats(userId: string): Promise<PlayerStatsRow | null> {
    const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[Supabase] fetchStats error:', error);
        return null;
    }
    return data as PlayerStatsRow | null;
}

export async function upsertStats(
    userId: string,
    stats: Partial<PlayerStatsRow>
): Promise<boolean> {
    const { error } = await supabase
        .from('player_stats')
        .upsert({ user_id: userId, ...stats, updated_at: new Date().toISOString() });

    if (error) { console.error('[Supabase] upsertStats error:', error); return false; }
    return true;
}

/**
 * Registra resultado de partida y actualiza stats.
 */
export async function recordMatchResult(opts: {
    userId: string;
    mode: 'VS_BOT' | 'LOCAL_PVP' | 'ONLINE_PVP';
    didWin: boolean;
    difficulty?: string;
    turnCount: number;
    startedAt: Date;
    finishedAt: Date;
}) {
    const { userId, mode, didWin, difficulty, turnCount, startedAt, finishedAt } = opts;

    // 1. Insertar en historial
    await supabase.from('game_matches').insert({
        mode,
        player_a_id: userId,
        winner_id: didWin ? userId : null,
        is_draw: false,
        difficulty: difficulty ?? null,
        turn_count: turnCount,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
    });

    // 2. Fetch estadísticas actuales
    const current = await fetchStats(userId);
    const base: PlayerStatsRow = current ?? {
        total_matches: 0,
        total_wins: 0,
        total_losses: 0,
        vs_bot_wins: 0,
        vs_bot_losses: 0,
        win_streak: 0,
        best_streak: 0,
        regalias: 0,
        wildcards: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
        last_free_pack: null,
    };

    const updated: Partial<PlayerStatsRow> = {
        total_matches: base.total_matches + 1,
        total_wins: didWin ? base.total_wins + 1 : base.total_wins,
        total_losses: !didWin ? base.total_losses + 1 : base.total_losses,
        vs_bot_wins: (mode === 'VS_BOT' && didWin) ? base.vs_bot_wins + 1 : base.vs_bot_wins,
        vs_bot_losses: (mode === 'VS_BOT' && !didWin) ? base.vs_bot_losses + 1 : base.vs_bot_losses,
        win_streak: didWin ? base.win_streak + 1 : 0,
        best_streak: didWin
            ? Math.max(base.best_streak, base.win_streak + 1)
            : base.best_streak,
        regalias: base.regalias + (didWin ? 15 : 5),
    };

    await upsertStats(userId, updated);
}

/**
 * Marca que el usuario reclamó el sobre gratuito hoy.
 */
export async function claimFreePackTimestamp(userId: string): Promise<boolean> {
    return upsertStats(userId, { last_free_pack: new Date().toISOString() });
}

/**
 * Verifica si el usuario puede recibir sobre gratuito (24h cooldown).
 */
export async function canClaimFreePack(userId: string): Promise<boolean> {
    const stats = await fetchStats(userId);
    if (!stats?.last_free_pack) return true;
    const lastClaim = new Date(stats.last_free_pack);
    const now = new Date();
    const hours = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
    return hours >= 24;
}
