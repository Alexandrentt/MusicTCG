# MusicTCG — Optimización de Base de Datos
## Documento completo de implementación

---

## CONTEXTO Y DECISIONES DE DISEÑO

### Principio central
El generador de cartas (`generateCard`) es **determinístico**: el mismo `trackId` de iTunes
siempre produce exactamente la misma carta para todos los usuarios. Por tanto, el `CardData`
completo nunca necesita persistir en Supabase. Solo persisten los IDs y metadatos mínimos
que no se pueden regenerar.

### Qué persiste en Supabase (irremplazable)
| Entidad | Por qué es irremplazable |
|---|---|
| `user_inventory` | Qué IDs tiene y cuántas copias |
| `user_decks` | Nombre, portada, qué cartas lo componen |
| `deck_cards` | Lista de card_ids por mazo |
| `user_profile` | Regalías, wildcards, configuración |
| `friends` | Relaciones sociales |
| `favorites` | Marcadores visuales del usuario |
| `match_history` | Últimas 5 partidas (resultado + mazo usado) |
| `match_deck_cards` | Qué cartas componían el mazo de esa partida |
| `mythic_songs` | Canciones que el admin marcó como míticas |
| `discovered_songs` | Descubrimientos globales |

### Qué NO persiste en Supabase
- `CardData` completo (nombre, stats, abilities, artwork, etc.) → se regenera en cliente
- Estado del combate → es efímero, vive solo en React
- Configuración de UI → Zustand + localStorage

### Tamaño estimado por usuario
| Tabla | Filas típicas | Bytes/fila | Total |
|---|---|---|---|
| user_inventory | 300 cartas | ~75 bytes | ~22KB |
| user_decks | 5 mazos | ~100 bytes | ~500B |
| deck_cards | 200 cartas (5×40) | ~30 bytes | ~6KB |
| user_profile | 1 | ~400 bytes | ~400B |
| friends | 20 | ~50 bytes | ~1KB |
| favorites | 30 | ~40 bytes | ~1.2KB |
| match_history | 5 | ~120 bytes | ~600B |
| match_deck_cards | 200 (5×40) | ~30 bytes | ~6KB |
| **TOTAL** | | | **~38KB por usuario** |

**Free tier (500MB) → ~13,000 usuarios antes de necesitar Pro.**

---

## PASO 1: SQL — Ejecutar en Supabase Dashboard > SQL Editor

**Ejecutar todo esto de una vez. Usa `IF NOT EXISTS` y `IF NOT EXISTS` en columnas para ser seguro si ya existe algo.**

```sql
-- ============================================================
-- MusicTCG — Schema Optimizado
-- Ejecutar completo en SQL Editor de Supabase
-- ============================================================

-- ── Tabla de perfiles (reemplaza/extiende la tabla users existente) ──
-- Si ya tienes una tabla 'users', este ALTER agrega las columnas que falten.
-- Si no existe, el CREATE la crea desde cero.

CREATE TABLE IF NOT EXISTS public.user_profile (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              TEXT UNIQUE NOT NULL,
  discovery_username    TEXT,
  regalias              INTEGER DEFAULT 1500,
  wildcard_bronze       INTEGER DEFAULT 0,
  wildcard_silver       INTEGER DEFAULT 0,
  wildcard_gold         INTEGER DEFAULT 0,
  wildcard_platinum     INTEGER DEFAULT 0,
  wildcard_mythic       INTEGER DEFAULT 0,
  wildcard_prog_bronze  INTEGER DEFAULT 0,
  wildcard_prog_silver  INTEGER DEFAULT 0,
  wildcard_prog_gold    INTEGER DEFAULT 0,
  wildcard_prog_platinum INTEGER DEFAULT 0,
  premium_gold          INTEGER DEFAULT 50,
  free_packs_count      INTEGER DEFAULT 0,
  last_free_pack_time   BIGINT DEFAULT 0,
  pity_gold             INTEGER DEFAULT 0,
  pity_platinum         INTEGER DEFAULT 0,
  language              TEXT DEFAULT 'es',
  play_music_in_battle  BOOLEAN DEFAULT true,
  is_admin              BOOLEAN DEFAULT false,
  role                  TEXT DEFAULT 'FREE',
  is_paying             BOOLEAN DEFAULT false,
  is_online             BOOLEAN DEFAULT false,
  last_seen             TIMESTAMPTZ DEFAULT now(),
  has_completed_onboarding BOOLEAN DEFAULT false,
  has_received_initial_packs BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ── Inventario: solo IDs, sin CardData completo ──
CREATE TABLE IF NOT EXISTS public.user_inventory (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id     TEXT NOT NULL,   -- trackId de iTunes (ej: "123456789")
  count       SMALLINT DEFAULT 1 CHECK (count BETWEEN 1 AND 4),
  use_alt_art BOOLEAN DEFAULT false,
  alt_art_url TEXT,
  alt_art_source TEXT,         -- 'youtube' | 'caa' | 'generative'
  obtained_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_user       ON public.user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_obtained   ON public.user_inventory(user_id, obtained_at DESC);

-- ── Función para incrementar count de carta (atómica, evita race conditions) ──
CREATE OR REPLACE FUNCTION public.add_card_to_inventory(
  p_user_id UUID,
  p_card_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_count INTEGER;
  result JSONB;
BEGIN
  SELECT count INTO current_count
  FROM public.user_inventory
  WHERE user_id = p_user_id AND card_id = p_card_id;

  IF current_count IS NULL THEN
    -- Carta nueva
    INSERT INTO public.user_inventory (user_id, card_id, count)
    VALUES (p_user_id, p_card_id, 1);
    result = '{"action": "added", "count": 1}'::JSONB;

  ELSIF current_count < 4 THEN
    -- Incrementar
    UPDATE public.user_inventory
    SET count = count + 1
    WHERE user_id = p_user_id AND card_id = p_card_id;
    result = jsonb_build_object('action', 'incremented', 'count', current_count + 1);

  ELSE
    -- Ya tiene 4 copias → convertir a comodín (el cliente maneja el wildcard)
    result = jsonb_build_object('action', 'wildcard', 'count', current_count);
  END IF;

  RETURN result;
END;
$$;

-- ── Mazos ──
CREATE TABLE IF NOT EXISTS public.user_decks (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id    TEXT NOT NULL,    -- ID generado en cliente (timestamp string)
  name       TEXT NOT NULL,
  cover_art  TEXT,             -- URL de la portada del mazo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_decks_user ON public.user_decks(user_id);

-- ── Cartas de cada mazo ──
CREATE TABLE IF NOT EXISTS public.deck_cards (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id  TEXT NOT NULL,
  card_id  TEXT NOT NULL,
  count    SMALLINT DEFAULT 1 CHECK (count BETWEEN 1 AND 4),
  PRIMARY KEY (user_id, deck_id, card_id),
  FOREIGN KEY (user_id, deck_id) REFERENCES public.user_decks(user_id, deck_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deck_cards_user ON public.deck_cards(user_id, deck_id);

-- ── Amigos ──
CREATE TABLE IF NOT EXISTS public.friends (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_username TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_username  TEXT NOT NULL,
  to_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user    ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_freq_to         ON public.friend_requests(to_user_id);

-- ── Favoritos ──
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    TEXT NOT NULL,
  added_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_fav_user ON public.favorites(user_id);

-- ── Historial de partidas (máximo 5 por usuario, gestionado en cliente) ──
CREATE TABLE IF NOT EXISTS public.match_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent    TEXT NOT NULL,        -- username del rival o 'BOT_EASY' etc.
  is_vs_bot   BOOLEAN DEFAULT true,
  did_win     BOOLEAN NOT NULL,
  turn_count  INTEGER DEFAULT 0,
  difficulty  TEXT,
  played_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_player ON public.match_history(player_id, played_at DESC);

-- ── Cartas del mazo usado en cada partida ──
CREATE TABLE IF NOT EXISTS public.match_deck_cards (
  match_id UUID NOT NULL REFERENCES public.match_history(id) ON DELETE CASCADE,
  card_id  TEXT NOT NULL,
  count    SMALLINT DEFAULT 1,
  PRIMARY KEY (match_id, card_id)
);

-- ── Función para insertar partida y mantener solo las últimas 5 ──
CREATE OR REPLACE FUNCTION public.save_match_result(
  p_player_id  UUID,
  p_opponent   TEXT,
  p_is_vs_bot  BOOLEAN,
  p_did_win    BOOLEAN,
  p_turn_count INTEGER,
  p_difficulty TEXT,
  p_deck_cards JSONB  -- [{ card_id: "123", count: 2 }, ...]
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_match_id UUID;
  oldest_match_id UUID;
  match_count INTEGER;
  card_record JSONB;
BEGIN
  -- Insertar la partida nueva
  INSERT INTO public.match_history (player_id, opponent, is_vs_bot, did_win, turn_count, difficulty)
  VALUES (p_player_id, p_opponent, p_is_vs_bot, p_did_win, p_turn_count, p_difficulty)
  RETURNING id INTO new_match_id;

  -- Insertar las cartas del mazo
  FOR card_record IN SELECT * FROM jsonb_array_elements(p_deck_cards)
  LOOP
    INSERT INTO public.match_deck_cards (match_id, card_id, count)
    VALUES (
      new_match_id,
      card_record->>'card_id',
      (card_record->>'count')::SMALLINT
    );
  END LOOP;

  -- Contar partidas del usuario
  SELECT COUNT(*) INTO match_count
  FROM public.match_history
  WHERE player_id = p_player_id;

  -- Si hay más de 5, eliminar la más antigua
  IF match_count > 5 THEN
    SELECT id INTO oldest_match_id
    FROM public.match_history
    WHERE player_id = p_player_id
    ORDER BY played_at ASC
    LIMIT 1;

    DELETE FROM public.match_history WHERE id = oldest_match_id;
    -- match_deck_cards se elimina en cascada
  END IF;

  RETURN new_match_id;
END;
$$;

-- ── Canciones míticas (solo admin puede escribir) ──
CREATE TABLE IF NOT EXISTS public.mythic_songs (
  track_id    TEXT PRIMARY KEY,
  track_name  TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  added_by    UUID REFERENCES auth.users(id),
  added_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Descubrimientos globales ──
CREATE TABLE IF NOT EXISTS public.discovered_songs (
  card_id       TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  artist        TEXT NOT NULL,
  rarity        TEXT,
  artwork_url   TEXT,
  discovered_by TEXT,
  times_found   INTEGER DEFAULT 1,
  discovered_at TIMESTAMPTZ DEFAULT now()
);

-- ── Trigger: actualizar updated_at automáticamente ──
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profile_updated ON public.user_profile;
CREATE TRIGGER trg_profile_updated
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_deck_updated ON public.user_decks;
CREATE TRIGGER trg_deck_updated
  BEFORE UPDATE ON public.user_decks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Trigger: crear perfil automáticamente al registrarse ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profile (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════

ALTER TABLE public.user_profile      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_decks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_cards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_deck_cards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mythic_songs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_songs  ENABLE ROW LEVEL SECURITY;

-- Perfil: leer todos (para buscar amigos por username), editar solo el propio
CREATE POLICY "profile_read"   ON public.user_profile FOR SELECT USING (true);
CREATE POLICY "profile_own"    ON public.user_profile FOR ALL   USING (auth.uid() = id);

-- Inventario, mazos, etc.: solo el dueño
CREATE POLICY "inv_own"        ON public.user_inventory   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "decks_own"      ON public.user_decks       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "deck_cards_own" ON public.deck_cards       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "friends_own"    ON public.friends          FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "freq_own"       ON public.friend_requests  FOR ALL USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "fav_own"        ON public.favorites        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "match_own"      ON public.match_history    FOR ALL USING (auth.uid() = player_id);
CREATE POLICY "match_deck_own" ON public.match_deck_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.match_history WHERE id = match_id AND player_id = auth.uid()));

-- Míticas: todos leen, solo admin escribe
CREATE POLICY "mythic_read"    ON public.mythic_songs FOR SELECT USING (true);
CREATE POLICY "mythic_write"   ON public.mythic_songs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profile WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "mythic_delete"  ON public.mythic_songs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_profile WHERE id = auth.uid() AND is_admin = true));

-- Descubrimientos: todos leen, cualquier usuario autenticado puede insertar/actualizar
CREATE POLICY "disc_read"      ON public.discovered_songs FOR SELECT USING (true);
CREATE POLICY "disc_write"     ON public.discovered_songs FOR ALL   USING (auth.uid() IS NOT NULL);

-- ── Marcar al admin (ejecutar manualmente después de registrarte) ──
-- UPDATE public.user_profile SET is_admin = true, role = 'ADMIN'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'TU_USERNAME@musictcg.app');
```

---

## PASO 2: Servicio de sincronización — `lib/database/supabaseSync.ts`

**Reemplazar el archivo completo con este contenido:**

```typescript
// lib/database/supabaseSync.ts
import { supabase } from '@/lib/supabase';
import { CardData } from '@/lib/engine/generator';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface InventoryRow {
  card_id:        string;
  count:          number;
  use_alt_art:    boolean;
  alt_art_url:    string | null;
  alt_art_source: string | null;
  obtained_at:    string;
}

export interface DeckRow {
  deck_id:   string;
  name:      string;
  cover_art: string | null;
  cards:     Record<string, number>; // { card_id: count } — construido en cliente
}

export interface MatchRow {
  id:          string;
  opponent:    string;
  is_vs_bot:   boolean;
  did_win:     boolean;
  turn_count:  number;
  difficulty:  string | null;
  played_at:   string;
  deck_cards?: { card_id: string; count: number }[];
}

export interface ProfileRow {
  username:              string;
  discovery_username:    string | null;
  regalias:              number;
  wildcard_bronze:       number;
  wildcard_silver:       number;
  wildcard_gold:         number;
  wildcard_platinum:     number;
  wildcard_mythic:       number;
  wildcard_prog_bronze:  number;
  wildcard_prog_silver:  number;
  wildcard_prog_gold:    number;
  wildcard_prog_platinum: number;
  premium_gold:          number;
  free_packs_count:      number;
  last_free_pack_time:   number;
  pity_gold:             number;
  pity_platinum:         number;
  language:              string;
  play_music_in_battle:  boolean;
  is_admin:              boolean;
  role:                  string;
  is_paying:             boolean;
  has_completed_onboarding: boolean;
  has_received_initial_packs: boolean;
}

// ── Obtener usuario actual ────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── Perfil ───────────────────────────────────────────────────────────────────

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
      deck_id:   deck.deck_id,
      name:      deck.name,
      cover_art: deck.cover_art,
      cards:     deckCardMap,
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

// ── Amigos ───────────────────────────────────────────────────────────────────

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
export async function saveMatch(opts: {
  userId:     string;
  opponent:   string;
  isVsBot:    boolean;
  didWin:     boolean;
  turnCount:  number;
  difficulty?: string;
  deckCards:  { card_id: string; count: number }[];
}): Promise<boolean> {
  const { error } = await supabase.rpc('save_match_result', {
    p_player_id:  opts.userId,
    p_opponent:   opts.opponent,
    p_is_vs_bot:  opts.isVsBot,
    p_did_win:    opts.didWin,
    p_turn_count: opts.turnCount,
    p_difficulty: opts.difficulty ?? null,
    p_deck_cards: opts.deckCards,
  });
  if (error) { console.error('[sync] saveMatch:', error); return false; }
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

let mythicCache: Set<string> | null = null;
let mythicCacheExpiry = 0;

export async function getMythicTrackIds(): Promise<Set<string>> {
  if (mythicCache && Date.now() < mythicCacheExpiry) return mythicCache;

  const { data } = await supabase.from('mythic_songs').select('track_id');
  mythicCache = new Set((data || []).map(r => r.track_id));
  mythicCacheExpiry = Date.now() + 5 * 60 * 1000; // 5 min
  return mythicCache;
}

// ── Descubrimientos globales ─────────────────────────────────────────────────

export async function logDiscovery(card: CardData, discoveredBy: string): Promise<void> {
  const { error } = await supabase
    .from('discovered_songs')
    .upsert({
      card_id:       card.id,
      name:          card.name,
      artist:        card.artist,
      rarity:        card.rarity,
      artwork_url:   card.artworkUrl,
      discovered_by: discoveredBy,
      times_found:   1,
      discovered_at: new Date().toISOString(),
    }, { onConflict: 'card_id' });

  // Si ya existe, solo incrementar times_found
  if (!error) {
    await supabase.rpc('increment_discovery', { p_card_id: card.id }).catch(() => {});
  }
}
```

---

## PASO 3: Regenerador de inventario — `lib/engine/inventoryLoader.ts`

**Crear este archivo nuevo:**

```typescript
// lib/engine/inventoryLoader.ts
// Carga el inventario desde Supabase y regenera CardData en cliente.
// Se llama UNA SOLA VEZ al hacer login.

import { generateCard, CardData } from './generator';
import { fetchInventoryRows, getMythicTrackIds, InventoryRow } from '@/lib/database/supabaseSync';

export interface InventoryItem {
  card:         CardData;
  count:        number;
  obtainedAt:   number;
  useAltArt:    boolean;
  altArtUrl?:   string;
  altArtSource?: string;
}

const ITUNES_BATCH_SIZE = 150;

/**
 * Hace batch lookup a iTunes de múltiples trackIds en paralelo.
 * 500 cartas = 4 requests simultáneos → ~1-2 segundos.
 */
async function batchFetchFromItunes(
  trackIds: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, any>> {
  const resultMap = new Map<string, any>();
  const batches: string[][] = [];

  for (let i = 0; i < trackIds.length; i += ITUNES_BATCH_SIZE) {
    batches.push(trackIds.slice(i, i + ITUNES_BATCH_SIZE));
  }

  let loaded = 0;

  await Promise.all(
    batches.map(async (batch) => {
      try {
        const ids  = batch.join(',');
        const res  = await fetch(`https://itunes.apple.com/lookup?id=${ids}`);
        const data = await res.json();

        for (const track of data.results || []) {
          if (track.trackId) {
            resultMap.set(String(track.trackId), track);
          }
        }

        loaded += batch.length;
        onProgress?.(loaded, trackIds.length);
      } catch (err) {
        console.warn('[inventoryLoader] batch failed:', err);
        loaded += batch.length;
        onProgress?.(loaded, trackIds.length);
      }
    })
  );

  return resultMap;
}

/**
 * Función principal. Carga inventario completo desde Supabase + iTunes.
 *
 * @param userId  ID del usuario en Supabase
 * @param onProgress  Callback de progreso (0-100) para la animación de carga
 * @returns Record<string, InventoryItem> listo para escribir al store
 */
export async function loadInventory(
  userId: string,
  onProgress?: (percent: number, message: string) => void
): Promise<Record<string, InventoryItem>> {

  onProgress?.(5, 'Conectando con tu colección...');

  // 1. Traer IDs desde Supabase (muy rápido, datos mínimos)
  const rows = await fetchInventoryRows(userId);
  if (rows.length === 0) {
    onProgress?.(100, 'Colección vacía');
    return {};
  }

  onProgress?.(15, `${rows.length} cartas encontradas...`);

  // 2. Obtener IDs míticos para el generador
  const mythicIds = await getMythicTrackIds();
  onProgress?.(20, 'Verificando rarezas especiales...');

  // 3. Batch lookup a iTunes
  const trackIds = rows.map(r => r.card_id);
  const trackDataMap = await batchFetchFromItunes(trackIds, (loaded, total) => {
    const percent = 20 + Math.floor((loaded / total) * 70);
    onProgress?.(percent, `Cargando cartas... ${loaded}/${total}`);
  });

  onProgress?.(90, 'Regenerando tu colección...');

  // 4. Regenerar CardData con el generador determinístico
  const inventory: Record<string, InventoryItem> = {};

  for (const row of rows) {
    const trackData = trackDataMap.get(row.card_id);

    let card: CardData;

    if (trackData) {
      // Caso normal: regenerar desde datos de iTunes
      card = generateCard(trackData, undefined, undefined, mythicIds);
    } else {
      // Fallback: iTunes no devolvió este track (eliminado, región, etc.)
      // Generar carta "fantasma" que mantiene su slot en el inventario
      card = generateCard({
        trackId:         row.card_id,
        trackName:       'Track Desconocido',
        artistName:      'Artista Desconocido',
        collectionName:  '',
        primaryGenreName: 'Unknown',
        artworkUrl100:   '',
      }, undefined, undefined, mythicIds);
    }

    inventory[row.card_id] = {
      card,
      count:         row.count,
      obtainedAt:    new Date(row.obtained_at).getTime(),
      useAltArt:     row.use_alt_art ?? false,
      altArtUrl:     row.alt_art_url ?? undefined,
      altArtSource:  row.alt_art_source ?? undefined,
    };
  }

  onProgress?.(100, '¡Colección lista!');
  return inventory;
}
```

---

## PASO 4: Animación de carga — `components/CollectionLoader.tsx`

**Crear este archivo nuevo:**

```typescript
// components/CollectionLoader.tsx
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Music } from 'lucide-react';

interface CollectionLoaderProps {
  isVisible: boolean;
  percent: number;
  message: string;
  cardCount?: number;
}

export default function CollectionLoader({
  isVisible,
  percent,
  message,
  cardCount,
}: CollectionLoaderProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, delay: 0.2 } }}
          className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-center p-8"
        >
          {/* Logo animado */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-12"
          >
            <div className="relative w-24 h-24">
              {/* Anillo exterior giratorio */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/40 border-r-white/20"
              />
              {/* Anillo interior */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-3 rounded-full border-2 border-transparent border-t-cyan-400/60 border-l-cyan-400/30"
              />
              {/* Icono central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Music className="w-8 h-8 text-white/60" />
              </div>
            </div>
          </motion.div>

          {/* Texto principal */}
          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2"
          >
            Cargando tu Colección
          </motion.h2>

          {cardCount !== undefined && cardCount > 0 && (
            <p className="text-cyan-400/60 text-sm font-bold mb-8 uppercase tracking-widest">
              {cardCount} cartas
            </p>
          )}

          {/* Barra de progreso */}
          <div className="w-full max-w-xs">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Mensaje de estado */}
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-center text-[11px] text-white/30 font-bold uppercase tracking-widest"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Cartas flotando de fondo (decorativo) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 100, rotate: (i - 3) * 8 }}
                animate={{
                  opacity: [0, 0.06, 0.06, 0],
                  y: [100, -20],
                }}
                transition={{
                  duration: 4,
                  delay: i * 0.7,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                className="absolute w-16 h-24 bg-white/5 rounded-xl border border-white/5"
                style={{ left: `${15 + i * 14}%`, bottom: 0 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## PASO 5: Integrar en `components/SupabaseSync.tsx`

**Reemplazar el archivo completo:**

```typescript
// components/SupabaseSync.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayerStore } from '@/store/usePlayerStore';
import { loadInventory } from '@/lib/engine/inventoryLoader';
import { fetchProfile, fetchDecks, fetchFriends, fetchFavorites, upsertProfile } from '@/lib/database/supabaseSync';
import CollectionLoader from '@/components/CollectionLoader';

function debounce<F extends (...args: any[]) => any>(fn: F, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export default function SupabaseSync() {
  const [loading, setLoading]   = useState(false);
  const [percent, setPercent]   = useState(0);
  const [message, setMessage]   = useState('');
  const [cardCount, setCardCount] = useState(0);
  const isWriting = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    const handleUser = async (userId: string) => {
      if (initialized.current) return;
      initialized.current = true;

      setLoading(true);
      setPercent(0);
      setMessage('Iniciando sesión...');

      try {
        // 1. Cargar perfil (regalías, wildcards, configuración)
        const profile = await fetchProfile(userId);
        if (profile) {
          isWriting.current = true;
          usePlayerStore.setState({
            regalias:            profile.regalias,
            wildcards: {
              BRONZE:   profile.wildcard_bronze,
              SILVER:   profile.wildcard_silver,
              GOLD:     profile.wildcard_gold,
              PLATINUM: profile.wildcard_platinum,
              MYTHIC:   profile.wildcard_mythic,
            },
            wildcardProgress: {
              BRONZE:   profile.wildcard_prog_bronze,
              SILVER:   profile.wildcard_prog_silver,
              GOLD:     profile.wildcard_prog_gold,
              PLATINUM: profile.wildcard_prog_platinum,
              MYTHIC:   0,
            },
            premiumGold:         profile.premium_gold,
            freePacksCount:      profile.free_packs_count,
            lastFreePackTime:    profile.last_free_pack_time,
            pityCounters: {
              GOLD:     profile.pity_gold,
              PLATINUM: profile.pity_platinum,
            },
            language:            profile.language,
            discoveryUsername:   profile.discovery_username || profile.username,
            playMusicInBattle:   profile.play_music_in_battle,
            role:                profile.role as any,
            isPaying:            profile.is_paying,
            hasCompletedOnboarding: profile.has_completed_onboarding,
            hasReceivedInitialPacks: profile.has_received_initial_packs,
          });
          setTimeout(() => { isWriting.current = false; }, 100);
        }

        // 2. Cargar inventario con animación
        setMessage('Conectando con tu colección...');
        const inventory = await loadInventory(userId, (p, msg) => {
          setPercent(p);
          setMessage(msg);
          if (p === 15) {
            // Ya sabemos cuántas cartas hay
            setCardCount(usePlayerStore.getState().inventory
              ? Object.keys(usePlayerStore.getState().inventory).length
              : 0);
          }
        });

        setCardCount(Object.keys(inventory).length);
        isWriting.current = true;
        usePlayerStore.setState({ inventory });
        setTimeout(() => { isWriting.current = false; }, 100);

        // 3. Cargar mazos
        setMessage('Cargando mazos...');
        setPercent(92);
        const deckRows = await fetchDecks(userId);
        const decks: Record<string, any> = {};
        for (const row of deckRows) {
          decks[row.deck_id] = {
            id:       row.deck_id,
            name:     row.name,
            coverArt: row.cover_art ?? undefined,
            cards:    row.cards,
          };
        }
        isWriting.current = true;
        usePlayerStore.setState({ decks });
        setTimeout(() => { isWriting.current = false; }, 100);

        // 4. Cargar favoritos
        const favoriteIds = await fetchFavorites(userId);
        // Los favoritos se manejan como un Set en el store
        // (agregar `favoriteCardIds: Set<string>` al store si no existe)
        usePlayerStore.setState({ favoriteCardIds: new Set(favoriteIds) } as any);

        setPercent(100);
        setMessage('¡Listo!');

        await new Promise(r => setTimeout(r, 600));

      } finally {
        setLoading(false);
        initialized.current = false; // Permitir re-init en próximo login
      }
    };

    // Sync de escritura al store → Supabase (debounced, 2 segundos)
    const debouncedWrite = debounce(async (userId: string, state: any) => {
      if (isWriting.current) return;
      await upsertProfile(userId, {
        regalias:              state.regalias,
        wildcard_bronze:       state.wildcards?.BRONZE ?? 0,
        wildcard_silver:       state.wildcards?.SILVER ?? 0,
        wildcard_gold:         state.wildcards?.GOLD ?? 0,
        wildcard_platinum:     state.wildcards?.PLATINUM ?? 0,
        wildcard_mythic:       state.wildcards?.MYTHIC ?? 0,
        wildcard_prog_bronze:  state.wildcardProgress?.BRONZE ?? 0,
        wildcard_prog_silver:  state.wildcardProgress?.SILVER ?? 0,
        wildcard_prog_gold:    state.wildcardProgress?.GOLD ?? 0,
        wildcard_prog_platinum: state.wildcardProgress?.PLATINUM ?? 0,
        premium_gold:          state.premiumGold ?? 0,
        free_packs_count:      state.freePacksCount ?? 0,
        last_free_pack_time:   state.lastFreePackTime ?? 0,
        pity_gold:             state.pityCounters?.GOLD ?? 0,
        pity_platinum:         state.pityCounters?.PLATINUM ?? 0,
        language:              state.language ?? 'es',
        play_music_in_battle:  state.playMusicInBattle ?? true,
        has_completed_onboarding: state.hasCompletedOnboarding ?? false,
        has_received_initial_packs: state.hasReceivedInitialPacks ?? false,
      });
    }, 2000);

    // Suscribir a cambios del store para sync
    const unsubStore = usePlayerStore.subscribe(state => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && !isWriting.current) {
          debouncedWrite(session.user.id, state);
        }
      });
    });

    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        handleUser(session.user.id);
      } else {
        initialized.current = false;
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleUser(session.user.id);
    });

    return () => {
      subscription.unsubscribe();
      unsubStore();
    };
  }, []);

  return (
    <CollectionLoader
      isVisible={loading}
      percent={percent}
      message={message}
      cardCount={cardCount}
    />
  );
}
```

---

## PASO 6: Actualizar `addCard` en `store/usePlayerStore.ts`

Cuando el usuario obtiene una carta nueva (abrir sobre, craftear), hay que escribir a Supabase además del store local. Buscar la función `addCard` en el store y al final de la acción exitosa agregar la escritura a Supabase:

```typescript
// En usePlayerStore.ts, modificar addCard para también escribir a Supabase

addCard: (card) => {
  let result = { added: false, convertedToWildcard: false };

  set((state) => {
    // ... lógica existente sin cambios ...
    // Solo agregar el timestamp:
    return {
      inventory: {
        ...state.inventory,
        [targetCardId]: {
          card: existing ? existing.card : card,
          count: count + 1,
          obtainedAt: existing?.obtainedAt ?? Date.now(),
          useAltArt: existing?.useAltArt ?? false,
        }
      }
    };
  });

  // Escribir a Supabase de forma asíncrona (no bloquea la UI)
  // Importar addCard del sync al inicio del archivo:
  // import { addCard as addCardToSupabase } from '@/lib/database/supabaseSync';
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      import('@/lib/database/supabaseSync').then(({ addCard: syncAddCard }) => {
        syncAddCard(session.user!.id, card.id);
      });
    }
  });

  return result;
},
```

---

## PASO 7: Actualizar `millCard` en `store/usePlayerStore.ts`

Igual que `addCard`, agregar escritura asíncrona a Supabase:

```typescript
// Al final de millCard, después de set():
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    import('@/lib/database/supabaseSync').then(({ removeCard }) => {
      removeCard(session.user!.id, cardId);
    });
  }
});
```

---

## NOTAS FINALES DE IMPLEMENTACIÓN

1. **Orden de ejecución**: SQL primero, luego los archivos TypeScript, luego actualizar el store.

2. **Compatibilidad con Zustand localStorage**: El store sigue persistiendo en localStorage como caché local. Supabase es la fuente de verdad solo para el inventario y perfil. Si hay conflicto (localStorage más nuevo que Supabase), Supabase gana al hacer login.

3. **El `increment_discovery` RPC** mencionado en `logDiscovery` necesita este SQL adicional:
```sql
CREATE OR REPLACE FUNCTION public.increment_discovery(p_card_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.discovered_songs
  SET times_found = times_found + 1
  WHERE card_id = p_card_id;
END;
$$;
```

4. **Migración de datos existentes**: Si ya tienes usuarios con datos en el schema viejo (`inventories` con JSONB, `decks` con JSONB), necesitas un script de migración. Dado que estás en desarrollo sin usuarios reales, lo más limpio es borrar las tablas viejas y empezar con el schema nuevo.

5. **`favoriteCardIds` en el store**: Agregar este campo al `PlayerState`:
```typescript
favoriteCardIds: Set<string>;
// En el estado inicial: favoriteCardIds: new Set(),
// En las acciones: toggleFavorite ya existe pero ahora también escribe a Supabase via toggleFavorite() del sync.
```
