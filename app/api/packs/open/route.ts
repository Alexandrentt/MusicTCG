import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateCard } from '@/lib/engine/generator';

// Géneros para variedad en los packs
const GENRES = ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'country', 'r&b', 'indie'];

/**
 * POST /api/packs/open
 * 
 * Abre sobres de forma segura desde el servidor.
 * El servidor:
 * 1. Valida la autenticación del usuario
 * 2. Verifica que tiene sobres disponibles en BD
 * 3. Llama a iTunes para obtener canciones
 * 4. Genera las cartas con el RNG del servidor
 * 5. Guarda las cartas en `player_inventory` de Supabase
 * 6. Descuenta los sobres usados en `player_stats`
 * 7. Devuelve las cartas generadas al cliente (solo para display)
 */
export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const packsToOpen = Math.min(Math.max(1, body.count ?? 1), 10); // Máximo 10 sobres por request

        // 2. Verificar sobres disponibles en base de datos
        const { data: statsRow, error: statsError } = await supabase
            .from('player_stats')
            .select('last_free_pack')
            .eq('user_id', user.id)
            .single();

        // Lógica de packs: 1 pack gratuito cada hora
        const now = Date.now();
        const lastPackTime = statsRow?.last_free_pack ? new Date(statsRow.last_free_pack).getTime() : 0;
        const oneHour = 60 * 60 * 1000;
        const hoursPassed = Math.floor((now - lastPackTime) / oneHour);
        const availablePacks = Math.min(hoursPassed, 5); // Máximo 5 acumulados

        if (availablePacks < packsToOpen) {
            const nextPackMs = oneHour - ((now - lastPackTime) % oneHour);
            return NextResponse.json({
                error: 'No tienes suficientes sobres',
                availablePacks,
                nextPackIn: Math.ceil(nextPackMs / 60000) // minutos
            }, { status: 400 });
        }

        // 3. Obtener mythic track IDs
        const { data: mythics } = await supabase
            .from('mythic_songs')
            .select('track_id');
        const mythicTrackIds = new Set((mythics || []).map((m: any) => m.track_id));

        // 4. Fetch de canciones desde iTunes (servidor → no expuesto al cliente)
        const totalCards = packsToOpen * 5;
        const shuffledGenres = [...GENRES].sort(() => 0.5 - Math.random()).slice(0, 3);

        const fetches = shuffledGenres.map(genre =>
            fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(genre)}&entity=song&limit=50&country=mx`)
                .then(r => r.json())
                .catch(() => ({ results: [] }))
        );
        const resultsPool = await Promise.all(fetches);
        const allTracks = resultsPool.flatMap((r: any) => r.results || []);

        if (allTracks.length === 0) {
            return NextResponse.json({ error: 'No se pudieron obtener canciones' }, { status: 503 });
        }

        // 5. Selección aleatoria de canciones y generación de cartas (RNG del servidor)
        const shuffled = [...allTracks].sort(() => 0.5 - Math.random());
        const selectedTracks = shuffled.slice(0, totalCards);
        const generatedCards = selectedTracks.map(track => generateCard(track, undefined, undefined, mythicTrackIds));

        // 6. Guardar cartas en player_inventory (upsert por card_id y user_id)
        for (const card of generatedCards) {
            // Verificar si ya existe la carta
            const { data: existing } = await supabase
                .from('player_inventory')
                .select('id, count')
                .eq('user_id', user.id)
                .eq('card_id', card.id)
                .maybeSingle();

            if (existing) {
                // Ya tiene la carta: incrementar count (máximo 4)
                if (existing.count < 4) {
                    await supabase
                        .from('player_inventory')
                        .update({ count: existing.count + 1 })
                        .eq('id', existing.id);
                }
                // Si count >= 4: se convierte a wildcard (logic manejada en cliente via isDuplicate flag)
            } else {
                // Nueva carta: insertar
                await supabase
                    .from('player_inventory')
                    .insert({
                        user_id: user.id,
                        card_id: card.id,
                        card_data: card,
                        count: 1
                    });
            }
        }

        // 7. Actualizar last_free_pack en player_stats
        // Calculamos el nuevo timestamp basado en cuántos packs usamos
        const newLastPackTime = new Date(lastPackTime + (packsToOpen * oneHour)).toISOString();
        await supabase
            .from('player_stats')
            .upsert({
                user_id: user.id,
                last_free_pack: newLastPackTime,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        return NextResponse.json({
            success: true,
            cards: generatedCards,
            packsOpened: packsToOpen,
            remainingPacks: availablePacks - packsToOpen
        });

    } catch (error: any) {
        console.error('[/api/packs/open] Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
