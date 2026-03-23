-- ============================================================
-- FIX: Crear tabla global_discoveries que falta
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Crear tabla global_discoveries (la que realmente usa el código)
CREATE TABLE IF NOT EXISTS public.global_discoveries (
  card_id       TEXT PRIMARY KEY,
  card_data     JSONB,                    -- Datos completos de la carta
  discovered_by TEXT,                     -- Username del descubridor
  discovered_at TIMESTAMPTZ DEFAULT now(),
  total_owners  INTEGER DEFAULT 1         -- Contador de propietarios
);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_global_disc_card ON public.global_discoveries(card_id);
CREATE INDEX IF NOT EXISTS idx_global_disc_date ON public.global_discoveries(discovered_at DESC);

-- Activar RLS
ALTER TABLE public.global_discoveries ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "global_disc_read"  ON public.global_discoveries FOR SELECT USING (true);
CREATE POLICY "global_disc_write" ON public.global_discoveries FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================
-- COMPLETADO
-- ============================================================
