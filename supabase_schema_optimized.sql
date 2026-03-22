-- ============================================================
-- MusicTCG — Optimized Database Schema Migration
-- Date: March 2026
-- Purpose: Normalize JSONB fields for better scalability and querying
-- ============================================================

-- ============================================================
-- PART 1: Expand player_stats with separate wildcard columns
-- (Better than JSONB for querying and indexing)
-- ============================================================

-- Add columns for wildcards (if not exists)
ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS wildcard_bronze INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_silver INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_platinum INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_mythic INTEGER DEFAULT 0;

-- Add columns for wildcard progress
ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS wildcard_progress_bronze INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_progress_silver INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_progress_gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_progress_platinum INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wildcard_progress_mythic INTEGER DEFAULT 0;

-- Add pity counters (separate columns for better tracking)
ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS pity_gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pity_platinum INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pity_mythic INTEGER DEFAULT 0;

-- Add free packs tracking
ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS free_packs_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_free_pack_time BIGINT DEFAULT 0;

-- Add premium currency
ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS premium_gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paying BOOLEAN DEFAULT false;

-- Add rank and level data (stored as JSONB for flexibility but structured)
ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS rank_data JSONB DEFAULT '{"tier":"UNRANKED","points":0,"streak":0,"bestStreak":0,"matches":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS level_data JSONB DEFAULT '{"level":1,"currentXP":0,"totalXP":0,"xpToNext":100}'::jsonb;

-- Migrate existing wildcards JSONB to separate columns
UPDATE public.player_stats 
SET 
  wildcard_bronze = COALESCE((wildcards->>'BRONZE')::INTEGER, 0),
  wildcard_silver = COALESCE((wildcards->>'SILVER')::INTEGER, 0),
  wildcard_gold = COALESCE((wildcards->>'GOLD')::INTEGER, 0),
  wildcard_platinum = COALESCE((wildcards->>'PLATINUM')::INTEGER, 0),
  wildcard_mythic = COALESCE((wildcards->>'MYTHIC')::INTEGER, 0)
WHERE wildcards IS NOT NULL;

-- Add index for regalias (common query for leaderboards)
CREATE INDEX IF NOT EXISTS idx_stats_regalias ON public.player_stats(regalias DESC);

-- Add index for premium users
CREATE INDEX IF NOT EXISTS idx_stats_paying ON public.player_stats(is_paying) WHERE is_paying = true;

-- ============================================================
-- PART 2: Expand profiles table with additional user data
-- ============================================================

-- Add missing user profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS regalias INTEGER DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS is_paying BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discovery_username TEXT,
  ADD COLUMN IF NOT EXISTS free_packs_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_free_pack_time BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_received_initial_packs BOOLEAN DEFAULT false;

-- Add indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_discovery ON public.profiles(discovery_username);

-- Update RLS policy for profiles to allow reading all profiles
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Allow insert for trigger
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- PART 3: Create normalized deck_cards table
-- (One row per card per deck instead of JSONB blob)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deck_cards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id     TEXT NOT NULL,  -- References player_decks.deck_id
  card_id     TEXT NOT NULL,
  count       SMALLINT DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, deck_id, card_id)
);

-- Enable RLS
ALTER TABLE public.deck_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only deck owner can access
CREATE POLICY "deck_cards_own" ON public.deck_cards
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for deck_cards
CREATE INDEX IF NOT EXISTS idx_deck_cards_user_deck ON public.deck_cards(user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_card ON public.deck_cards(card_id);

-- Trigger to update deck updated_at when cards change
CREATE OR REPLACE FUNCTION public.handle_deck_cards_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.player_decks 
    SET updated_at = now() 
    WHERE user_id = OLD.user_id AND deck_id = OLD.deck_id;
    RETURN OLD;
  ELSE
    UPDATE public.player_decks 
    SET updated_at = now() 
    WHERE user_id = NEW.user_id AND deck_id = NEW.deck_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_deck_cards_change ON public.deck_cards;
CREATE TRIGGER on_deck_cards_change
  AFTER INSERT OR UPDATE OR DELETE ON public.deck_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_deck_cards_change();

-- ============================================================
-- PART 4: Create user_missions table (instead of storing in player_stats)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_missions (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  missions              JSONB DEFAULT '[]'::jsonb,
  last_reset_time       BIGINT DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_missions_own" ON public.user_missions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PART 5: Create chest_slots table for persistent chest storage
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chest_slots (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chest_type    TEXT NOT NULL,
  status        TEXT DEFAULT 'LOCKED', -- LOCKED, UNLOCKING, READY
  unlocks_at    BIGINT,
  time_remaining_ms INTEGER,
  rewards       JSONB,
  accelerate_cost INTEGER DEFAULT 0,
  slot_index    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, slot_index)
);

ALTER TABLE public.chest_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chest_slots_own" ON public.chest_slots
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chest_slots_user ON public.chest_slots(user_id);

-- ============================================================
-- PART 6: Create mythic_discoveries table for tracking mythic card finds
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mythic_discoveries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id         TEXT NOT NULL,
  card_data       JSONB NOT NULL,
  discovered_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discovered_at   TIMESTAMPTZ DEFAULT now(),
  is_unique       BOOLEAN DEFAULT true, -- first discovery
  total_owners    INTEGER DEFAULT 1
);

ALTER TABLE public.mythic_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mythic_discoveries_read" ON public.mythic_discoveries FOR SELECT USING (true);
CREATE POLICY "mythic_discoveries_insert" ON public.mythic_discoveries FOR INSERT WITH CHECK (auth.uid() = discovered_by);
CREATE POLICY "mythic_discoveries_update_own" ON public.mythic_discoveries FOR UPDATE USING (auth.uid() = discovered_by);

CREATE INDEX IF NOT EXISTS idx_mythic_discoveries_card ON public.mythic_discoveries(card_id);
CREATE INDEX IF NOT EXISTS idx_mythic_discoveries_user ON public.mythic_discoveries(discovered_by);
CREATE INDEX IF NOT EXISTS idx_mythic_discoveries_date ON public.mythic_discoveries(discovered_at DESC);

-- ============================================================
-- PART 7: Create user_settings table for preferences
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language              TEXT DEFAULT 'es',
  play_music_in_battle  BOOLEAN DEFAULT true,
  volume                FLOAT DEFAULT 0.7,
  feature_flags         JSONB DEFAULT '{"cosmetics":false,"skins":false,"battlePass":false,"ads":true}'::jsonb,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_own" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PART 8: Additional indexes for inventory optimization
-- ============================================================

-- Index for filtering by rarity (common query)
CREATE INDEX IF NOT EXISTS idx_inventory_user_rarity 
  ON public.player_inventory(user_id, (card_data->>'rarity'));

-- Index for sorting by obtained date
CREATE INDEX IF NOT EXISTS idx_inventory_obtained 
  ON public.player_inventory(user_id, obtained_at DESC);

-- Index for artist searches
CREATE INDEX IF NOT EXISTS idx_inventory_artist 
  ON public.player_inventory((card_data->>'artist'));

-- ============================================================
-- PART 9: Create views for common queries
-- ============================================================

-- View: User collection summary
CREATE OR REPLACE VIEW public.user_collection_summary AS
SELECT 
  user_id,
  COUNT(*) as total_cards,
  SUM(count) as total_copies,
  COUNT(DISTINCT card_data->>'rarity') as rarity_types,
  SUM(CASE WHEN card_data->>'rarity' = 'MYTHIC' THEN count ELSE 0 END) as mythic_count,
  SUM(CASE WHEN card_data->>'rarity' = 'PLATINUM' THEN count ELSE 0 END) as platinum_count,
  SUM(CASE WHEN card_data->>'rarity' = 'GOLD' THEN count ELSE 0 END) as gold_count,
  SUM(CASE WHEN card_data->>'rarity' = 'SILVER' THEN count ELSE 0 END) as silver_count,
  SUM(CASE WHEN card_data->>'rarity' = 'BRONZE' THEN count ELSE 0 END) as bronze_count,
  MAX(obtained_at) as last_obtained_at
FROM public.player_inventory
GROUP BY user_id;

-- View: Deck summaries with card counts
CREATE OR REPLACE VIEW public.deck_summaries AS
SELECT 
  pd.user_id,
  pd.deck_id,
  pd.name,
  pd.cover_art,
  COALESCE(SUM(dc.count), 0) as total_cards,
  COUNT(DISTINCT dc.card_id) as unique_cards,
  pd.created_at,
  pd.updated_at
FROM public.player_decks pd
LEFT JOIN public.deck_cards dc ON pd.user_id = dc.user_id AND pd.deck_id = dc.deck_id
GROUP BY pd.user_id, pd.deck_id, pd.name, pd.cover_art, pd.created_at, pd.updated_at;

-- View: Mythic leaderboard (who has most mythics)
CREATE OR REPLACE VIEW public.mythic_leaderboard AS
SELECT 
  p.username,
  p.discovery_username,
  COUNT(DISTINCT md.card_id) as unique_mythics,
  SUM(md.total_owners) as total_discoveries
FROM public.profiles p
LEFT JOIN public.mythic_discoveries md ON p.id = md.discovered_by
GROUP BY p.id, p.username, p.discovery_username
ORDER BY unique_mythics DESC, total_discoveries DESC;

-- ============================================================
-- PART 10: Functions for data integrity
-- ============================================================

-- Function to get user's total card count
CREATE OR REPLACE FUNCTION public.get_user_card_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(count), 0)::INTEGER FROM public.player_inventory WHERE user_id = p_user_id;
$$;

-- Function to get user's deck count
CREATE OR REPLACE FUNCTION public.get_user_deck_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM public.player_decks WHERE user_id = p_user_id;
$$;

-- Function to safely add card (handles master card logic)
CREATE OR REPLACE FUNCTION public.add_card_safe(
  p_user_id UUID,
  p_card_id TEXT,
  p_card_data JSONB,
  p_count INTEGER DEFAULT 1
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check existing count
  SELECT count INTO existing_count
  FROM public.player_inventory
  WHERE user_id = p_user_id AND card_id = p_card_id;
  
  -- If would exceed 4 copies, reject
  IF COALESCE(existing_count, 0) + p_count > 4 THEN
    RETURN false;
  END IF;
  
  -- Insert or update
  INSERT INTO public.player_inventory (user_id, card_id, card_data, count)
  VALUES (p_user_id, p_card_id, p_card_data, p_count)
  ON CONFLICT (user_id, card_id)
  DO UPDATE SET count = player_inventory.count + p_count;
  
  RETURN true;
END;
$$;

-- Grant access to views
GRANT SELECT ON public.user_collection_summary TO authenticated;
GRANT SELECT ON public.deck_summaries TO authenticated;
GRANT SELECT ON public.mythic_leaderboard TO authenticated;

-- ============================================================
-- NOTES:
-- This migration improves scalability by:
-- 1. Normalizing wildcards from JSONB to separate columns
-- 2. Creating deck_cards table for one-row-per-card structure
-- 3. Adding proper indexes for common queries
-- 4. Creating views for leaderboard and summary queries
-- 5. Expanding profiles with user preferences
-- ============================================================
