// lib/database/supabaseSync.ts
// ─────────────────────────────────────────────────────────────────────────
// Optimized Supabase Sync Service - Using Normalized Schema v2
// ─────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabase';
import { CardData } from '../engine/generator';

// ── Tipos optimizados para el nuevo schema ────────────────────────────────

export interface PlayerStatsRow {
  // Legacy JSONB (mantener para compatibilidad)
  wildcards?: { BRONZE: number; SILVER: number; GOLD: number; PLATINUM: number; MYTHIC: number };
  
  // Nuevas columnas normalizadas
  wildcard_bronze: number;
  wildcard_silver: number;
  wildcard_gold: number;
  wildcard_platinum: number;
  wildcard_mythic: number;
  wildcard_progress_bronze: number;
  wildcard_progress_silver: number;
  wildcard_progress_gold: number;
  wildcard_progress_platinum: number;
  wildcard_progress_mythic: number;
  pity_gold: number;
  pity_platinum: number;
  pity_mythic: number;
  free_packs_count: number;
  last_free_pack_time: number;
  premium_gold: number;
  is_paying: boolean;
  rank_data?: { tier: string; points: number; streak: number; bestStreak: number; matches: number };
  level_data?: { level: number; currentXP: number; totalXP: number; xpToNext: number };
  
  // Stats de partidas
  total_matches: number;
  total_wins: number;
  total_losses: number;
  vs_bot_wins: number;
  vs_bot_losses: number;
  win_streak: number;
  best_streak: number;
  regalias: number;
  last_free_pack: string | null;
}

export interface InventoryRow {
  card_id: string;
  card_data: CardData;
  count: number;
  obtained_at: string;
}

export interface DeckCardRow {
  deck_id: string;
  card_id: string;
  count: number;
}

// ── Obtener usuario actual ────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── INVENTARIO ───────────────────────────────────────────────────────────

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

export async function addCardToInventory(
  userId: string,
  card: CardData,
  count: number = 1
): Promise<boolean> {
  // Usar la función RPC segura que maneja el límite de 4 copias
  const { error } = await supabase.rpc('add_card_safe', {
    p_user_id: userId,
    p_card_id: card.id,
    p_card_data: card,
    p_count: count,
  });

  if (error) {
    console.error('[Supabase] addCardToInventory error:', error);
    return false;
  }
  return true;
}

export async function removeCardFromInventory(
  userId: string,
  cardId: string
): Promise<boolean> {
  const { data, error: fetchError } = await supabase
    .from('player_inventory')
    .select('count')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single();

  if (fetchError || !data) return false;

  if (data.count <= 1) {
    const { error } = await supabase
      .from('player_inventory')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId);
    if (error) { console.error('[Supabase] removeCard delete error:', error); return false; }
  } else {
    const { error } = await supabase
      .from('player_inventory')
      .update({ count: data.count - 1 })
      .eq('user_id', userId)
      .eq('card_id', cardId);
    if (error) { console.error('[Supabase] removeCard decrement error:', error); return false; }
  }
  return true;
}

// ── MAZOS (NORMALIZADO - deck_cards) ─────────────────────────────────────

export interface DeckRow {
  deck_id: string;
  name: string;
  cover_art?: string;
  updated_at: string;
}

export async function fetchDecks(userId: string): Promise<DeckRow[]> {
  const { data, error } = await supabase
    .from('player_decks')
    .select('deck_id, name, cover_art, updated_at')
    .eq('user_id', userId);

  if (error) { console.error('[Supabase] fetchDecks error:', error); return []; }
  return (data || []) as DeckRow[];
}

export async function fetchDeckCards(userId: string, deckId: string): Promise<DeckCardRow[]> {
  const { data, error } = await supabase
    .from('deck_cards')
    .select('card_id, count')
    .eq('user_id', userId)
    .eq('deck_id', deckId);

  if (error) { console.error('[Supabase] fetchDeckCards error:', error); return []; }
  
  return (data || []).map(d => ({ deck_id: deckId, card_id: d.card_id, count: d.count }));
}

export async function saveDeck(
  userId: string,
  deckId: string,
  name: string,
  cards: Record<string, number>,
  coverArt?: string
): Promise<boolean> {
  // 1. Guardar/Actualizar el mazo
  const { error: deckError } = await supabase
    .from('player_decks')
    .upsert({
      user_id: userId,
      deck_id: deckId,
      name,
      cover_art: coverArt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,deck_id' });

  if (deckError) { console.error('[Supabase] saveDeck error:', deckError); return false; }

  // 2. Limpiar cartas antiguas del mazo
  await supabase
    .from('deck_cards')
    .delete()
    .eq('user_id', userId)
    .eq('deck_id', deckId);

  // 3. Insertar cartas normalizadas
  const deckCards = Object.entries(cards).map(([card_id, count]) => ({
    user_id: userId,
    deck_id: deckId,
    card_id,
    count,
  }));

  if (deckCards.length > 0) {
    const { error: cardsError } = await supabase
      .from('deck_cards')
      .insert(deckCards);
    
    if (cardsError) { console.error('[Supabase] saveDeck cards error:', cardsError); return false; }
  }

  return true;
}

export async function deleteDeck(userId: string, deckId: string): Promise<boolean> {
  // Las cartas se borran en cascada por el trigger o se manejan por RLS
  const { error } = await supabase
    .from('player_decks')
    .delete()
    .eq('user_id', userId)
    .eq('deck_id', deckId);

  if (error) { console.error('[Supabase] deleteDeck error:', error); return false; }
  return true;
}

// Función helper para obtener un mazo completo con sus cartas
export async function fetchCompleteDeck(userId: string, deckId: string): Promise<{ deck: DeckRow | null; cards: Record<string, number> }> {
  const [deckResult, cardsResult] = await Promise.all([
    supabase.from('player_decks').select('deck_id, name, cover_art, updated_at').eq('user_id', userId).eq('deck_id', deckId).single(),
    supabase.from('deck_cards').select('card_id, count').eq('user_id', userId).eq('deck_id', deckId)
  ]);

  const cards: Record<string, number> = {};
  (cardsResult.data || []).forEach(c => {
    cards[c.card_id] = c.count;
  });

  return {
    deck: deckResult.data as DeckRow | null,
    cards
  };
}

// ── ESTADÍSTICAS (COLUMNAS NORMALIZADAS) ─────────────────────────────────

export async function fetchStats(userId: string): Promise<PlayerStatsRow | null> {
  const { data, error } = await supabase
    .from('player_stats')
    .select(`
      total_matches, total_wins, total_losses, vs_bot_wins, vs_bot_losses,
      win_streak, best_streak, regalias, wildcards, last_free_pack,
      wildcard_bronze, wildcard_silver, wildcard_gold, wildcard_platinum, wildcard_mythic,
      wildcard_progress_bronze, wildcard_progress_silver, wildcard_progress_gold, wildcard_progress_platinum, wildcard_progress_mythic,
      pity_gold, pity_platinum, pity_mythic,
      free_packs_count, last_free_pack_time, premium_gold, is_paying,
      rank_data, level_data
    `)
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

export async function updateWildcards(
  userId: string,
  wildcards: { BRONZE?: number; SILVER?: number; GOLD?: number; PLATINUM?: number; MYTHIC?: number }
): Promise<boolean> {
  const updateData: Record<string, number> = {};
  if (wildcards.BRONZE !== undefined) updateData['wildcard_bronze'] = wildcards.BRONZE;
  if (wildcards.SILVER !== undefined) updateData['wildcard_silver'] = wildcards.SILVER;
  if (wildcards.GOLD !== undefined) updateData['wildcard_gold'] = wildcards.GOLD;
  if (wildcards.PLATINUM !== undefined) updateData['wildcard_platinum'] = wildcards.PLATINUM;
  if (wildcards.MYTHIC !== undefined) updateData['wildcard_mythic'] = wildcards.MYTHIC;

  const { error } = await supabase
    .from('player_stats')
    .update(updateData)
    .eq('user_id', userId);

  if (error) { console.error('[Supabase] updateWildcards error:', error); return false; }
  return true;
}

// ── REGISTRO DE PARTIDAS ────────────────────────────────────────────────

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

  // Actualizar stats
  const current = await fetchStats(userId);
  const base: PlayerStatsRow = current ?? {
    total_matches: 0, total_wins: 0, total_losses: 0,
    vs_bot_wins: 0, vs_bot_losses: 0, win_streak: 0, best_streak: 0,
    regalias: 0, last_free_pack: null,
    wildcard_bronze: 0, wildcard_silver: 0, wildcard_gold: 0, wildcard_platinum: 0, wildcard_mythic: 0,
    wildcard_progress_bronze: 0, wildcard_progress_silver: 0, wildcard_progress_gold: 0, wildcard_progress_platinum: 0, wildcard_progress_mythic: 0,
    pity_gold: 0, pity_platinum: 0, pity_mythic: 0,
    free_packs_count: 0, last_free_pack_time: 0, premium_gold: 0, is_paying: false,
  };

  const updated: Partial<PlayerStatsRow> = {
    total_matches: base.total_matches + 1,
    total_wins: didWin ? base.total_wins + 1 : base.total_wins,
    total_losses: !didWin ? base.total_losses + 1 : base.total_losses,
    vs_bot_wins: (mode === 'VS_BOT' && didWin) ? base.vs_bot_wins + 1 : base.vs_bot_wins,
    vs_bot_losses: (mode === 'VS_BOT' && !didWin) ? base.vs_bot_losses + 1 : base.vs_bot_losses,
    win_streak: didWin ? base.win_streak + 1 : 0,
    best_streak: didWin ? Math.max(base.best_streak, base.win_streak + 1) : base.best_streak,
    regalias: base.regalias + (didWin ? 15 : 5),
  };

  await upsertStats(userId, updated);
}

// ── PERFILES Y CONFIGURACIÓN ────────────────────────────────────────────

export async function fetchUserProfile(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) { console.error('[Supabase] fetchUserProfile error:', error); return null; }
  return data;
}

export async function updateUserProfile(userId: string, updates: Record<string, any>): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) { console.error('[Supabase] updateUserProfile error:', error); return false; }
  return true;
}

// ── MISIONES ────────────────────────────────────────────────────────────

export async function fetchUserMissions(userId: string): Promise<{ missions: any[]; last_reset_time: number } | null> {
  const { data, error } = await supabase
    .from('user_missions')
    .select('missions, last_reset_time')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] fetchUserMissions error:', error);
    return null;
  }
  
  return data ? { missions: data.missions || [], last_reset_time: data.last_reset_time || 0 } : null;
}

export async function saveUserMissions(userId: string, missions: any[], lastResetTime: number): Promise<boolean> {
  const { error } = await supabase
    .from('user_missions')
    .upsert({ 
      user_id: userId, 
      missions, 
      last_reset_time: lastResetTime,
      updated_at: new Date().toISOString()
    });

  if (error) { console.error('[Supabase] saveUserMissions error:', error); return false; }
  return true;
}

// ── COFRES ───────────────────────────────────────────────────────────────

export async function fetchChestSlots(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('chest_slots')
    .select('*')
    .eq('user_id', userId)
    .order('slot_index', { ascending: true });

  if (error) { console.error('[Supabase] fetchChestSlots error:', error); return []; }
  return data || [];
}

export async function saveChestSlot(userId: string, chest: any): Promise<boolean> {
  const { error } = await supabase
    .from('chest_slots')
    .upsert({
      user_id: userId,
      chest_type: chest.type,
      status: chest.status,
      unlocks_at: chest.unlocksAt,
      time_remaining_ms: chest.timeRemainingMs,
      rewards: chest.rewards,
      accelerate_cost: chest.accelerateCost,
      slot_index: chest.slotIndex || 0,
    }, { onConflict: 'user_id,slot_index' });

  if (error) { console.error('[Supabase] saveChestSlot error:', error); return false; }
  return true;
}

export async function deleteChestSlot(userId: string, chestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chest_slots')
    .delete()
    .eq('user_id', userId)
    .eq('id', chestId);

  if (error) { console.error('[Supabase] deleteChestSlot error:', error); return false; }
  return true;
}

// ── FUNCIONES LEGACY (mantener compatibilidad) ─────────────────────────

export async function claimFreePackTimestamp(userId: string): Promise<boolean> {
  return upsertStats(userId, { last_free_pack: new Date().toISOString() });
}

export async function canClaimFreePack(userId: string): Promise<boolean> {
  const stats = await fetchStats(userId);
  if (!stats?.last_free_pack) return true;
  const lastClaim = new Date(stats.last_free_pack);
  const now = new Date();
  const hours = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
  return hours >= 24;
}
