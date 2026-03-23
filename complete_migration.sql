-- ============================================================
-- MusicTCG — MIGRACIÓN COMPLETA A SCHEMA OPTIMIZADO
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ── PARTE 1: LIMPIEZA COMPLETA DE SCHEMA ANTIGUO ──
-- Esto borrará todas las tablas existentes para empezar desde cero

DROP TABLE IF EXISTS public.match_deck_cards CASCADE;
DROP TABLE IF EXISTS public.match_history CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
DROP TABLE IF EXISTS public.discovered_songs CASCADE;
DROP TABLE IF EXISTS public.mythic_songs CASCADE;
DROP TABLE IF EXISTS public.deck_cards CASCADE;
DROP TABLE IF EXISTS public.user_decks CASCADE;
DROP TABLE IF EXISTS public.user_inventory CASCADE;
DROP TABLE IF EXISTS public.player_stats CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_profile CASCADE;
DROP TABLE IF EXISTS public.inventories CASCADE;
DROP TABLE IF EXISTS public.decks CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.game_matches CASCADE;
DROP TABLE IF EXISTS public.global_discoveries CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.chest_slots CASCADE;
DROP TABLE IF EXISTS public.user_missions CASCADE;
DROP TABLE IF EXISTS public.mythic_discoveries CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Eliminar funciones y triggers antiguos
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.add_card_to_inventory() CASCADE;
DROP FUNCTION IF EXISTS public.save_match_result() CASCADE;
DROP FUNCTION IF EXISTS public.increment_discovery() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_card_count() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_deck_count() CASCADE;
DROP FUNCTION IF EXISTS public.add_card_safe() CASCADE;
DROP FUNCTION IF EXISTS public.handle_deck_cards_change() CASCADE;

-- Eliminar triggers antiguos (solo si las tablas existen)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Los demás triggers se eliminarán automáticamente con DROP TABLE CASCADE

-- Eliminar políticas RLS antiguas (solo si las tablas existen)
-- Las políticas se eliminarán automáticamente con DROP TABLE CASCADE

-- ── PARTE 2: CREACIÓN DEL SCHEMA OPTIMIZADO COMPLETO ──

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tabla de perfiles (reemplaza users) ──
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
  wildcard_prog_mythic   INTEGER DEFAULT 0,
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

-- ── FUNCIONES ──

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Función para añadir carta al inventario (atómica)
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

-- Función para guardar partida y mantener solo las últimas 5
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

-- Función para incrementar descubrimientos
CREATE OR REPLACE FUNCTION public.increment_discovery(p_card_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.discovered_songs
  SET times_found = times_found + 1
  WHERE card_id = p_card_id;
END;
$$;

-- Función para crear perfil automáticamente al registrarse (Compatible con Email Real)
-- Extrae username desde: 1) user_metadata.username, 2) user_metadata.full_name, 3) parte local del email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profile (id, username, discovery_username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── TRIGGERS ──

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_profile_updated ON public.user_profile;
CREATE TRIGGER trg_profile_updated
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_deck_updated ON public.user_decks;
CREATE TRIGGER trg_deck_updated
  BEFORE UPDATE ON public.user_decks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── ROW LEVEL SECURITY ──

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

-- Políticas de seguridad

-- Perfil: leer todos (para buscar amigos), editar solo el propio
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

-- ── MARCAR ADMIN MAESTRO (ejecutar manualmente después de registrar) ──
-- UPDATE public.user_profile SET is_admin = true, role = 'ADMIN'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'TU_EMAIL@musictcg.app');

-- ─── COMPLETADO ───
-- Schema optimizado implementado correctamente
