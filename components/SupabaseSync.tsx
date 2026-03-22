'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId, fetchProfile } from '@/lib/database/supabaseSync';
import { usePlayerStore } from '@/store/usePlayerStore';

/**
 * Componente que sincroniza silenciosamente el estado de Supabase con el store de Zustand.
 * Delega la visualización de carga al sistema nativo loading.tsx de Next.js.
 */
export default function SupabaseSync() {
  const { setInventory } = usePlayerStore();

  // ── Sincronización completa (Perfil + Inventario) ──────────────────────────
  useEffect(() => {
    const syncAllData = async (userId: string) => {
      console.log(`[SupabaseSync] Sincronizando datos para el usuario: ${userId}`);

      try {
        // 1. Cargar Perfil (Regalias, Comodines, Progreso)
        const profile = await fetchProfile(userId);
        if (profile) {
          console.log('[SupabaseSync] Perfil cargado:', profile);
          usePlayerStore.setState({
            regalias: profile.regalias,
            wildcards: {
              BRONZE: profile.wildcard_bronze,
              SILVER: profile.wildcard_silver,
              GOLD: profile.wildcard_gold,
              PLATINUM: profile.wildcard_platinum,
              MYTHIC: profile.wildcard_mythic
            },
            wildcardProgress: {
              BRONZE: profile.wildcard_prog_bronze,
              SILVER: profile.wildcard_prog_silver,
              GOLD: profile.wildcard_prog_gold,
              PLATINUM: profile.wildcard_prog_platinum,
              MYTHIC: profile.wildcard_prog_mythic || 0
            },
            premiumGold: profile.premium_gold,
            freePacksCount: profile.free_packs_count,
            lastFreePackTime: profile.last_free_pack_time,
            language: profile.language || 'es',
            playMusicInBattle: profile.play_music_in_battle,
            hasCompletedOnboarding: profile.has_completed_onboarding,
            hasReceivedInitialPacks: profile.has_received_initial_packs,
            role: profile.role as any,
            isPaying: profile.is_paying,
            discoveryUsername: profile.discovery_username || profile.username || ''
          });
        }

        // 2. Cargar Inventario (Regenerado en cliente)
        const { fetchInventoryWithData } = await import('@/lib/database/supabaseSync');
        const inventory = await fetchInventoryWithData(userId);
        if (inventory) {
          console.log(`[SupabaseSync] ${Object.keys(inventory).length} cartas cargadas en el inventario.`);
          setInventory(inventory);
        }

      } catch (err) {
        console.error('[SupabaseSync] Error crítico durante la sincronización:', err);
      }
    };

    const handleAuthChange = async (event: string, session: any) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        await syncAllData(session.user.id);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) syncAllData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    return () => subscription.unsubscribe();
  }, [setInventory]);

  // ── LOGOUT: Limpiar store ─────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        usePlayerStore.getState().resetAll(); // Usamos resetAll para limpiar todo el estado
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── SYNC: Sobreescribir acciones del store para persistir en Supabase ─────────────
  useEffect(() => {
    const originalAddCard = usePlayerStore.getState().addCard;
    const originalMillCard = usePlayerStore.getState().millCard;

    const wrappedAddCard = (card: any, count?: number) => {
      const result = originalAddCard(card, count);

      (async () => {
        const userId = await getCurrentUserId();
        if (userId) {
          const { addCard: addCardToDb, upsertProfile } = await import('@/lib/database/supabaseSync');
          await addCardToDb(userId, card.id);

          // También sincronizar regalias y comodines si hubo conversión
          if (result.convertedToWildcard) {
            const state = usePlayerStore.getState();
            await upsertProfile(userId, {
              wildcard_bronze: state.wildcards.BRONZE,
              wildcard_silver: state.wildcards.SILVER,
              wildcard_gold: state.wildcards.GOLD,
              wildcard_platinum: state.wildcards.PLATINUM,
              wildcard_mythic: state.wildcards.MYTHIC
            });
          }
        }
      })();

      return result;
    };

    const wrappedMillCard = (cardId: string, count?: number) => {
      const result = originalMillCard(cardId, count);

      (async () => {
        const userId = await getCurrentUserId();
        if (userId) {
          const { removeCard, upsertProfile } = await import('@/lib/database/supabaseSync');
          await removeCard(userId, cardId);

          // Sincronizar progreso de comodines tras moler
          const state = usePlayerStore.getState();
          await upsertProfile(userId, {
            wildcard_bronze: state.wildcards.BRONZE,
            wildcard_silver: state.wildcards.SILVER,
            wildcard_gold: state.wildcards.GOLD,
            wildcard_platinum: state.wildcards.PLATINUM,
            wildcard_mythic: state.wildcards.MYTHIC,
            wildcard_prog_bronze: state.wildcardProgress.BRONZE,
            wildcard_prog_silver: state.wildcardProgress.SILVER,
            wildcard_prog_gold: state.wildcardProgress.GOLD,
            wildcard_prog_platinum: state.wildcardProgress.PLATINUM,
            wildcard_prog_mythic: state.wildcardProgress.MYTHIC
          });
        }
      })();

      return result;
    };

    usePlayerStore.setState({
      addCard: wrappedAddCard as any,
      millCard: wrappedMillCard as any
    });

    return () => {
      usePlayerStore.setState({
        addCard: originalAddCard,
        millCard: originalMillCard
      });
    };
  }, []);

  return null;
}
