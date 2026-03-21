-- ============================================================
-- MusicTCG — Schema Real de Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Perfiles de usuario ──────────────────────────────────
-- Se crea automáticamente al hacer signUp via trigger
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Trigger: crea perfil al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
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

-- ── 2. Inventario del jugador ────────────────────────────────
-- Guarda todas las cartas que posee cada usuario
CREATE TABLE IF NOT EXISTS public.player_inventory (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    TEXT NOT NULL,           -- id del CardData
  card_data  JSONB NOT NULL,          -- CardData completo serializado
  count      INTEGER DEFAULT 1,       -- cuántas copias tiene
  obtained_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, card_id)
);

-- Upsert helper: añadir/actualizar carta
CREATE OR REPLACE FUNCTION public.upsert_card(
  p_user_id UUID,
  p_card_id TEXT,
  p_card_data JSONB,
  p_add_count INTEGER DEFAULT 1
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.player_inventory (user_id, card_id, card_data, count)
  VALUES (p_user_id, p_card_id, p_card_data, p_add_count)
  ON CONFLICT (user_id, card_id)
  DO UPDATE SET
    count = player_inventory.count + EXCLUDED.count,
    card_data = EXCLUDED.card_data;
END;
$$;

-- ── 3. Mazos del jugador ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_decks (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id    TEXT NOT NULL,           -- ID local del mazo
  name       TEXT NOT NULL,
  cards      JSONB NOT NULL,          -- { [cardId]: count }
  cover_art  TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, deck_id)
);

-- ── 4. Historial de partidas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_matches (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mode        TEXT NOT NULL CHECK (mode IN ('VS_BOT','LOCAL_PVP','ONLINE_PVP')),
  player_a_id UUID REFERENCES auth.users(id),
  player_b_id UUID REFERENCES auth.users(id),   -- NULL si es vs bot
  winner_id   UUID REFERENCES auth.users(id),   -- NULL si empate
  is_draw     BOOLEAN DEFAULT false,
  difficulty  TEXT,                              -- Solo relevante vs bot
  turn_count  INTEGER DEFAULT 0,
  started_at  TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  match_data  JSONB                              -- Full GameMatch object
);

-- ── 5. Estadísticas del jugador ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_stats (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_matches INTEGER DEFAULT 0,
  total_wins    INTEGER DEFAULT 0,
  total_losses  INTEGER DEFAULT 0,
  vs_bot_wins   INTEGER DEFAULT 0,
  vs_bot_losses INTEGER DEFAULT 0,
  win_streak    INTEGER DEFAULT 0,
  best_streak   INTEGER DEFAULT 0,
  regalias      INTEGER DEFAULT 0,
  wildcards     JSONB DEFAULT '{"BRONZE":0,"SILVER":0,"GOLD":0,"PLATINUM":0}'::jsonb,
  last_free_pack TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 6. Descubrimientos globales ──────────────────────────────
-- Qué cartas han sido descubiertas en el juego (para el modo Discoveries)
CREATE TABLE IF NOT EXISTS public.global_discoveries (
  card_id        TEXT PRIMARY KEY,
  card_data      JSONB NOT NULL,
  discovered_by  UUID REFERENCES auth.users(id),
  discovered_at  TIMESTAMPTZ DEFAULT now(),
  total_owners   INTEGER DEFAULT 1
);

-- ── 7. Amigos / Social ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','BLOCKED')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

-- ── 8. Row Level Security ────────────────────────────────────

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_decks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_discoveries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships           ENABLE ROW LEVEL SECURITY;

-- Perfiles: cualquiera puede leer, solo tú puedes editar el tuyo
CREATE POLICY "profiles_read_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Inventario: solo el dueño accede
CREATE POLICY "inventory_own" ON public.player_inventory
  FOR ALL USING (auth.uid() = user_id);

-- Mazos: solo el dueño accede
CREATE POLICY "decks_own" ON public.player_decks
  FOR ALL USING (auth.uid() = user_id);

-- Partidas: solo los participantes ven sus partidas
CREATE POLICY "matches_participants" ON public.game_matches
  FOR SELECT USING (auth.uid() = player_a_id OR auth.uid() = player_b_id OR player_b_id IS NULL);
CREATE POLICY "matches_insert_own" ON public.game_matches
  FOR INSERT WITH CHECK (auth.uid() = player_a_id);

-- Stats: solo el propio usuario
CREATE POLICY "stats_own" ON public.player_stats
  FOR ALL USING (auth.uid() = user_id);

-- Discoveries: todos pueden leer, autenticados pueden insertar
CREATE POLICY "discoveries_read" ON public.global_discoveries FOR SELECT USING (true);
CREATE POLICY "discoveries_insert" ON public.global_discoveries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Amigos: solo tus propias relaciones
CREATE POLICY "friends_own" ON public.friendships
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ── Índices para performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_user ON public.player_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_user ON public.player_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_a ON public.game_matches(player_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_b ON public.game_matches(player_b_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_date ON public.global_discoveries(discovered_at DESC);
