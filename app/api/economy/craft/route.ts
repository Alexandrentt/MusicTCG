import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Coste en wildcards por rareza
const CRAFT_COST: Record<string, number> = {
    BRONZE: 1,
    SILVER: 1,
    GOLD: 1,
    PLATINUM: 1,
    MYTHIC: 1,
};

// Wildcards por moler una carta
const MILL_YIELD: Record<string, number> = {
    BRONZE: 1,
    SILVER: 1,
    GOLD: 1,
    PLATINUM: 1,
    MYTHIC: 1,
};

/**
 * POST /api/economy/craft
 * Body: { cardId: string, cardData: CardData }
 * 
 * Craftea una carta gastando un wildcard del tipo correcto.
 * El servidor valida que el usuario tiene el wildcard y que no supera 4 copias.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await req.json();
        const { cardId, cardData } = body;
        if (!cardId || !cardData) {
            return NextResponse.json({ error: 'cardId y cardData son requeridos' }, { status: 400 });
        }

        const rarity = cardData.rarity as string;
        const cost = CRAFT_COST[rarity] ?? 1;

        // 1. Leer wildcards del perfil del usuario
        const { data: statsRow, error: statsError } = await supabase
            .from('player_stats')
            .select('wildcards')
            .eq('user_id', user.id)
            .single();

        if (statsError && statsError.code !== 'PGRST116') {
            throw statsError;
        }

        const wildcards = (statsRow?.wildcards ?? { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 }) as Record<string, number>;

        if ((wildcards[rarity] ?? 0) < cost) {
            return NextResponse.json({ error: `No tienes wildcards de tipo ${rarity}` }, { status: 400 });
        }

        // 2. Verificar copias en inventario (máx 4)
        const { data: existingItem } = await supabase
            .from('player_inventory')
            .select('id, count')
            .eq('user_id', user.id)
            .eq('card_id', cardId)
            .maybeSingle();

        if (existingItem && existingItem.count >= 4) {
            return NextResponse.json({ error: 'Ya tienes el máximo de copias (4)' }, { status: 400 });
        }

        // 3. Descontar wildcard
        const newWildcards = { ...wildcards, [rarity]: wildcards[rarity] - cost };
        await supabase
            .from('player_stats')
            .upsert({ user_id: user.id, wildcards: newWildcards, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        // 4. Añadir carta al inventario
        if (existingItem) {
            await supabase
                .from('player_inventory')
                .update({ count: existingItem.count + 1 })
                .eq('id', existingItem.id);
        } else {
            await supabase
                .from('player_inventory')
                .insert({ user_id: user.id, card_id: cardId, card_data: cardData, count: 1 });
        }

        return NextResponse.json({ success: true, newWildcards });
    } catch (error: any) {
        console.error('[/api/economy/craft] Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
