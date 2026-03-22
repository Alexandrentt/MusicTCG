// lib/database/supabaseSync.ts
// ─────────────────────────────────────────────────────────────────────────
// Optimized Supabase Sync Service - Using Normalized Schema v2
// ─────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabase';
import { CardData, generateCard } from '../engine/generator';
import { getMythicTrackIds } from '../admin/mythicService';

// ── Tipos optimizados para el nuevo schema ────────────────────────────────

export interface ProfileRow {
  username: string;
  discovery_username: string | null;
  regalias: number;
  wildcard_bronze: number;
  wildcard_silver: number;
  wildcard_gold: number;
  wildcard_platinum: number;
  wildcard_mythic: number;
  wildcard_prog_bronze: number;
  wildcard_prog_silver: number;
  wildcard_prog_gold: number;
  wildcard_prog_platinum: number;
  wildcard_prog_mythic: number;
  premium_gold: number;
  free_packs_count: number;
  last_free_pack_time: number;
  pity_gold: number;
  pity_platinum: number;
  language: string;
  play_music_in_battle: boolean;
  is_admin: boolean;
  role: string;
  is_paying: boolean;
  has_completed_onboarding: boolean;
  has_received_initial_packs: boolean;
}

export interface InventoryRow {
  card_id: string;
  count: number;
  use_alt_art: boolean;
  alt_art_url: string | null;
  alt_art_source: string | null;
  obtained_at: string;
}

export interface DeckRow {
  deck_id: string;
  name: string;
  cover_art: string | null;
  cards: Record<string, number>; // { card_id: count } — construido en cliente
}

export interface MatchRow {
  id: string;
  opponent: string;
  is_vs_bot: boolean;
  did_win: boolean;
  turn_count: number;
  difficulty: string | null;
  played_at: string;
  deck_cards?: { card_id: string; count: number }[];
}

// ── Obtener usuario actual ────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── Perfil ─────────────────────────────────────────────────────────────────--

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) { console.error('[sync] fetchProfile:', error); return null; }
  return data as ProfileRow | null;
}

export async function upsertProfile(userId: string, profile: Partial<ProfileRow>): Promise<boolean> {
  const { error } = await supabase
    .from('user_profile')
    .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
  if (error) { console.error('[sync] upsertProfile:', error); return false; }
  return true;
}

// ── Inventario ───────────────────────────────────────────────────────────────

/**
 * Carga solo los card_ids del inventario.
 * El cliente regenera el CardData con generateCard() + iTunes batch lookup.
 */
export async function fetchInventoryRows(userId: string): Promise<InventoryRow[]> {
  const { data, error } = await supabase
    .from('user_inventory')
    .select('card_id, count, use_alt_art, alt_art_url, alt_art_source, obtained_at')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false });

  if (error) { console.error('[sync] fetchInventoryRows:', error); return []; }
  return (data || []) as InventoryRow[];
}

/**
 * Función maestra para cargar el inventario con toda su data.
 * Combina filas de Supabase + Lookup de iTunes en lotes + Generación de CardData.
 * Esta función REEMPLAZA al antiguo inventoryLoader.
 */
export async function fetchInventoryWithData(userId: string): Promise<Record<string, any> | null> {
  try {
    // 1. Obtener filas del inventario (IDs y contadores)
    const rows = await fetchInventoryRows(userId);
    if (!rows || rows.length === 0) return {};

    // 2. Obtener IDs de canciones míticas para forzar su rareza
    const mythicTrackIds = await getMythicTrackIds().catch(() => new Set<string>());

    // 3. Agrupar IDs para lookup de iTunes (máximo 150 por petición según docs lógicos)
    const trackIds = rows.map(r => r.card_id);
    const itunesData: any[] = [];

    // iTunes Lookup en lotes de 50 para seguridad y rapidez
    for (let i = 0; i < trackIds.length; i += 50) {
      const batchIds = trackIds.slice(i, i + 50).join(',');
      const response = await fetch(`https://itunes.apple.com/lookup?id=${batchIds}`);
      const data = await response.json();
      if (data.results) {
        itunesData.push(...data.results);
      }
    }

    // 4. Mapear resultados por ID para acceso rápido
    const metadataMap = new Map(itunesData.map(r => [r.trackId.toString(), r]));

    // 5. Reconstruir el inventario para el store de Zustand
    const finalInventory: Record<string, any> = {};

    rows.forEach(row => {
      const metadata = metadataMap.get(row.card_id);

      // Intentamos generar la carta. Si no hay metadata, usamos un fallback mínimo
      let card: CardData;
      if (metadata) {
        card = generateCard(metadata, undefined, mythicTrackIds);
      } else {
        // Fallback básico si iTunes falló por este ID (poco probable)
        card = generateCard({
          trackId: row.card_id,
          trackName: 'Unknown Track',
          artistName: 'Unknown Artist'
        });
      }

      finalInventory[row.card_id] = {
        card,
        count: row.count,
        obtainedAt: new Date(row.obtained_at).getTime(),
        useAltArt: row.use_alt_art,
        altArtUrl: row.alt_art_url,
        altArtSource: row.alt_art_source
      };
    });

    return finalInventory;
  } catch (err) {
    console.error('[sync] Error crítico en fetchInventoryWithData:', err);
    return null;
  }
}

/**
 * Añade una carta. Usa la función SQL atómica para evitar race conditions.
 * Devuelve 'added' | 'incremented' | 'wildcard'
 */
export async function addCard(userId: string, cardId: string): Promise<'added' | 'incremented' | 'wildcard' | null> {
  const { data, error } = await supabase.rpc('add_card_to_inventory', {
    p_user_id: userId,
    p_card_id: cardId,
  });
  if (error) { console.error('[sync] addCard:', error); return null; }
  return (data as any)?.action ?? null;
}

/**
 * Elimina una copia de una carta (moler).
 * Si count llega a 0, elimina la fila.
 */
export async function removeCard(userId: string, cardId: string): Promise<boolean> {
  // Leer count actual
  const { data } = await supabase
    .from('user_inventory')
    .select('count')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .maybeSingle();

  if (!data) return false;

  if (data.count <= 1) {
    const { error } = await supabase
      .from('user_inventory')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId);
    return !error;
  } else {
    const { error } = await supabase
      .from('user_inventory')
      .update({ count: data.count - 1 })
      .eq('user_id', userId)
      .eq('card_id', cardId);
    return !error;
  }
}

/**
 * Actualiza preferencia de arte alternativo.
 */
export async function setAltArt(
  userId: string,
  cardId: string,
  useAlt: boolean,
  altUrl?: string,
  altSource?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_inventory')
    .update({ use_alt_art: useAlt, alt_art_url: altUrl ?? null, alt_art_source: altSource ?? null })
    .eq('user_id', userId)
    .eq('card_id', cardId);
  return !error;
}

// ── Mazos ────────────────────────────────────────────────────────────────────

export async function fetchDecks(userId: string): Promise<DeckRow[]> {
  // Traer cabeceras de mazos
  const { data: deckHeaders, error: e1 } = await supabase
    .from('user_decks')
    .select('deck_id, name, cover_art')
    .eq('user_id', userId);

  if (e1 || !deckHeaders) return [];

  // Traer cartas de todos los mazos en una sola query
  const deckIds = deckHeaders.map(d => d.deck_id);
  const { data: cards, error: e2 } = await supabase
    .from('deck_cards')
    .select('deck_id, card_id, count')
    .eq('user_id', userId)
    .in('deck_id', deckIds);

  if (e2) return [];

  // Combinar
  return deckHeaders.map(deck => {
    const deckCardMap: Record<string, number> = {};
    (cards || [])
      .filter(c => c.deck_id === deck.deck_id)
      .forEach(c => { deckCardMap[c.card_id] = c.count; });
    return {
      deck_id: deck.deck_id,
      name: deck.name,
      cover_art: deck.cover_art,
      cards: deckCardMap,
    };
  });
}

export async function saveDeck(
  userId: string,
  deckId: string,
  name: string,
  coverArt: string | undefined,
  cards: Record<string, number>  // { card_id: count }
): Promise<boolean> {
  // Upsert cabecera
  const { error: e1 } = await supabase
    .from('user_decks')
    .upsert({ user_id: userId, deck_id: deckId, name, cover_art: coverArt ?? null });
  if (e1) { console.error('[sync] saveDeck header:', e1); return false; }

  // Eliminar cartas viejas del mazo
  await supabase
    .from('deck_cards')
    .delete()
    .eq('user_id', userId)
    .eq('deck_id', deckId);

  // Insertar cartas nuevas
  const rows = Object.entries(cards)
    .filter(([, count]) => count > 0)
    .map(([card_id, count]) => ({ user_id: userId, deck_id: deckId, card_id, count }));

  if (rows.length > 0) {
    const { error: e2 } = await supabase.from('deck_cards').insert(rows);
    if (e2) { console.error('[sync] saveDeck cards:', e2); return false; }
  }

  return true;
}

export async function deleteDeck(userId: string, deckId: string): Promise<boolean> {
  // deck_cards se elimina en cascada
  const { error } = await supabase
    .from('user_decks')
    .delete()
    .eq('user_id', userId)
    .eq('deck_id', deckId);
  return !error;
}

// ── Amigos ─────────────────────────────────────────────────────────────────--

export async function fetchFriends(userId: string) {
  const { data } = await supabase
    .from('friends')
    .select('friend_id, friend_username, created_at')
    .eq('user_id', userId);
  return data || [];
}

export async function fetchFriendRequests(userId: string) {
  const { data } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, from_username, created_at')
    .eq('to_user_id', userId)
    .eq('status', 'PENDING');
  return data || [];
}

// ── Favoritos ────────────────────────────────────────────────────────────────

export async function fetchFavorites(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('favorites')
    .select('card_id')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  return (data || []).map(r => r.card_id);
}

export async function toggleFavorite(userId: string, cardId: string, add: boolean): Promise<boolean> {
  if (add) {
    const { error } = await supabase
      .from('favorites')
      .upsert({ user_id: userId, card_id: cardId });
    return !error;
  } else {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId);
    return !error;
  }
}

// ── Historial de partidas ────────────────────────────────────────────────────

/**
 * Guarda una partida. La función SQL mantiene automáticamente
 * solo las últimas 5 partidas del usuario.
 */
export async function recordMatchResult(opts: {
  userId: string;
  mode: string;
  didWin: boolean;
  difficulty: string;
  turnCount: number;
  startedAt: Date;
  finishedAt: Date;
}): Promise<boolean> {
  const { error } = await supabase.rpc('save_match_result', {
    p_player_id: opts.userId,
    p_opponent: opts.mode,
    p_is_vs_bot: opts.mode === 'VS_BOT',
    p_did_win: opts.didWin,
    p_turn_count: opts.turnCount,
    p_difficulty: opts.difficulty ?? null,
    p_deck_cards: [], // Opcional por ahora
  });
  if (error) { console.error('[sync] recordMatchResult:', error); return false; }
  return true;
}

export async function fetchMatchHistory(userId: string): Promise<MatchRow[]> {
  const { data: matches } = await supabase
    .from('match_history')
    .select('id, opponent, is_vs_bot, did_win, turn_count, difficulty, played_at')
    .eq('player_id', userId)
    .order('played_at', { ascending: false })
    .limit(5);

  if (!matches || matches.length === 0) return [];

  // Traer cartas de todas las partidas
  const matchIds = matches.map(m => m.id);
  const { data: deckCards } = await supabase
    .from('match_deck_cards')
    .select('match_id, card_id, count')
    .in('match_id', matchIds);

  return matches.map(m => ({
    ...m,
    deck_cards: (deckCards || [])
      .filter(c => c.match_id === m.id)
      .map(c => ({ card_id: c.card_id, count: c.count })),
  }));
}

// ── Míticas ──────────────────────────────────────────────────────────────────
// (Usando importación centralizada de mythicService.ts)

// ── Descubrimientos globales ─────────────────────────────────────────────────

export async function logDiscovery(card: CardData, discoveredBy: string): Promise<void> {
  const { error } = await supabase
    .from('discovered_songs')
    .upsert({
      card_id: card.id,
      name: card.name,
      artist: card.artist,
      rarity: card.rarity,
      artwork_url: card.artworkUrl,
      discovered_by: discoveredBy,
      times_found: 1,
      discovered_at: new Date().toISOString(),
    }, { onConflict: 'card_id' });

  // Si ya existe, solo incrementar times_found
  if (!error) {
    try {
      await supabase.rpc('increment_discovery', { p_card_id: card.id });
    } catch {
      // Silenciar error si la función no existe
    }
  }
}

// ── FUNCIONES LEGACY (para compatibilidad temporal) ─────────────────────────

// Mapeo de funciones antiguas al nuevo sistema
export async function fetchInventory(userId: string): Promise<any[]> {
  const rows = await fetchInventoryRows(userId);
  return rows.map(row => ({
    card_id: row.card_id,
    card_data: null, // El cliente debe regenerar esto
    count: row.count,
    obtained_at: row.obtained_at
  }));
}

export async function addCardToInventory(
  userId: string,
  card: CardData,
  count: number = 1
): Promise<boolean> {
  const result = await addCard(userId, card.id);
  return result !== null;
}

export async function removeCardFromInventory(
  userId: string,
  cardId: string
): Promise<boolean> {
  return removeCard(userId, cardId);
}

export async function fetchStats(userId: string): Promise<any | null> {
  return fetchProfile(userId);
}

export async function upsertStats(
  userId: string,
  stats: any
): Promise<boolean> {
  return upsertProfile(userId, stats);
}

export async function fetchUserProfile(userId: string): Promise<any | null> {
  return fetchProfile(userId);
}

export async function updateUserProfile(userId: string, updates: Record<string, any>): Promise<boolean> {
  return upsertProfile(userId, updates);
}

// Funciones eliminadas - retornan valores por defecto
export async function fetchUserMissions(userId: string): Promise<{ missions: any[]; last_reset_time: number } | null> {
  return { missions: [], last_reset_time: 0 };
}

export async function saveUserMissions(userId: string, missions: any[], lastResetTime: number): Promise<boolean> {
  return true; // No-op - las misiones se manejan en el cliente
}

export async function fetchChestSlots(userId: string): Promise<any[]> {
  return []; // No-op - los cofres se eliminaron del optimizado
}

export async function saveChestSlot(userId: string, chest: any): Promise<boolean> {
  return true; // No-op - los cofres se eliminaron del optimizado
}

export async function deleteChestSlot(userId: string, chestId: string): Promise<boolean> {
  return true; // No-op - los cofres se eliminaron del optimizado
}

export async function claimFreePackTimestamp(userId: string): Promise<boolean> {
  return upsertProfile(userId, { last_free_pack_time: Date.now() });
}

export async function canClaimFreePack(userId: string): Promise<boolean> {
  const profile = await fetchProfile(userId);
  if (!profile) return true;
  const hoursSince = (Date.now() - profile.last_free_pack_time) / (1000 * 60 * 60);
  return hoursSince >= 24;
}
