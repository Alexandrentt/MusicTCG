'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePlayerStore } from '@/store/usePlayerStore';

/**
 * Hook que sincroniza el inventario del jugador con Supabase.
 * 
 * Flujo:
 * 1. Escucha cambios de sesión con onAuthStateChange
 * 2. Al iniciar sesión (SIGNED_IN), llama a /api/inventory/sync
 * 3. Hidrata el store de Zustand con los datos del servidor
 * 4. Al cerrar sesión (SIGNED_OUT), resetea el store a valores vacíos
 */
export function useInventorySync() {
    const supabase = createSupabaseBrowserClient();
    const syncedRef = useRef(false);

    const syncFromServer = useCallback(async () => {
        if (syncedRef.current) return;
        try {
            const res = await fetch('/api/inventory/sync');
            if (!res.ok) return;

            const data = await res.json();
            if (!data.success) return;

            // Hidratar el store con datos del servidor
            const store = usePlayerStore.getState();

            // Usar setState directo para actualizar sin disparar efectos
            usePlayerStore.setState({
                inventory: data.inventory ?? {},
                wildcards: data.wildcards ?? store.wildcards,
                regalias: data.regalias ?? store.regalias,
                freePacksCount: data.freePacksAvailable ?? 0,
                lastFreePackTime: data.lastFreePackTime ?? 0,
            });

            syncedRef.current = true;
            console.log('[InventorySync] Sincronizado desde servidor ✅', {
                cards: Object.keys(data.inventory).length
            });
        } catch (err) {
            console.error('[InventorySync] Error al sincronizar:', err);
        }
    }, []);

    useEffect(() => {
        // Sincronizar al montar si ya hay sesión
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                syncFromServer();
            }
        });

        // Escuchar cambios de sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                syncedRef.current = false; // Resetear para re-sincronizar
                syncFromServer();
            } else if (event === 'SIGNED_OUT') {
                syncedRef.current = false;
                // Resetear inventario al cerrar sesión
                usePlayerStore.setState({
                    inventory: {},
                    freePacksCount: 0,
                    lastFreePackTime: 0,
                });
            }
        });

        return () => subscription.unsubscribe();
    }, [syncFromServer, supabase]);

    return { syncFromServer };
}
