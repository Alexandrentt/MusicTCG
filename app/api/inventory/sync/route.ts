import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/inventory/sync
 * 
 * Sincroniza el inventario del usuario autenticado desde Supabase.
 * El cliente usa esto al iniciar sesión para hidratar el store de Zustand
 * con los datos reales de la base de datos.
 * 
 * Retorna: { inventory, wildcards, regalias, freePacksAvailable }
 */
export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Obtener inventario de cartas
        const { data: inventoryRows, error: invError } = await supabase
            .from('player_inventory')
            .select('card_id, card_data, count, obtained_at')
            .eq('user_id', user.id);

        if (invError) throw invError;

        // Convertir a formato Record<string, { card, count, obtainedAt }>
        const inventory: Record<string, any> = {};
        for (const row of (inventoryRows || [])) {
            inventory[row.card_id] = {
                card: row.card_data,
                count: row.count,
                obtainedAt: new Date(row.obtained_at).getTime()
            };
        }

        // Obtener stats del jugador (wildcards, regalías, etc.)
        const { data: statsRow } = await supabase
            .from('player_stats')
            .select('wildcards, regalias, last_free_pack')
            .eq('user_id', user.id)
            .maybeSingle();

        // Calcular sobres disponibles
        const lastPackTime = statsRow?.last_free_pack
            ? new Date(statsRow.last_free_pack).getTime()
            : 0;
        const hoursPassed = Math.floor((Date.now() - lastPackTime) / (60 * 60 * 1000));
        const freePacksAvailable = Math.min(hoursPassed, 5);

        return NextResponse.json({
            success: true,
            inventory,
            wildcards: statsRow?.wildcards ?? { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 },
            regalias: statsRow?.regalias ?? 0,
            freePacksAvailable,
            lastFreePackTime: lastPackTime
        });

    } catch (error: any) {
        console.error('[/api/inventory/sync] Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
