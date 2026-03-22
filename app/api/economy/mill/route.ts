import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Wildcards que se ganan por moler
const MILL_YIELD: Record<string, number> = {
    BRONZE: 1,
    SILVER: 1,
    GOLD: 1,
    PLATINUM: 1,
    MYTHIC: 1,
};

/**
 * POST /api/economy/mill
 * Body: { cardId: string, rarity: string }
 * 
 * Muele una copia de la carta, reduciendo su count en 1.
 * Si count llega a 0, elimina el registro.
 * Otorga un wildcard de la rareza correspondiente.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await req.json();
        const { cardId, rarity } = body;
        if (!cardId || !rarity) {
            return NextResponse.json({ error: 'cardId y rarity son requeridos' }, { status: 400 });
        }

        // 1. Verificar que el usuario tiene la carta
        const { data: existingItem, error: itemError } = await supabase
            .from('player_inventory')
            .select('id, count')
            .eq('user_id', user.id)
            .eq('card_id', cardId)
            .maybeSingle();

        if (itemError) throw itemError;
        if (!existingItem || existingItem.count <= 0) {
            return NextResponse.json({ error: 'No tienes esta carta en el inventario' }, { status: 400 });
        }

        // 2. Reducir count o eliminar
        if (existingItem.count > 1) {
            await supabase
                .from('player_inventory')
                .update({ count: existingItem.count - 1 })
                .eq('id', existingItem.id);
        } else {
            await supabase
                .from('player_inventory')
                .delete()
                .eq('id', existingItem.id);
        }

        // 3. Incrementar wildcard del usuario
        const yieldAmount = MILL_YIELD[rarity] ?? 1;
        const { data: statsRow } = await supabase
            .from('player_stats')
            .select('wildcards')
            .eq('user_id', user.id)
            .maybeSingle();

        const currentWildcards = (statsRow?.wildcards ?? { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 }) as Record<string, number>;
        const newWildcards = { ...currentWildcards, [rarity]: (currentWildcards[rarity] ?? 0) + yieldAmount };

        await supabase
            .from('player_stats')
            .upsert({ user_id: user.id, wildcards: newWildcards, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        return NextResponse.json({ success: true, newWildcards, wildcardGained: yieldAmount });
    } catch (error: any) {
        console.error('[/api/economy/mill] Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
