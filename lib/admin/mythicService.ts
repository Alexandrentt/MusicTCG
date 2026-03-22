// lib/admin/mythicService.ts
import { supabase } from '@/lib/supabase';

export interface MythicSong {
    trackId: string;
    trackName: string;
    artistName: string;
    reason?: string;
}

/**
 * Agrega una canción como mítica. Solo funciona si el usuario es admin.
 * El RLS de Supabase lo bloquea si no lo es.
 */
export async function addMythicSong(song: MythicSong): Promise<{ success: boolean; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'No autenticado' };

    // Verificar admin en cliente (el RLS lo verifica también en servidor)
    const { data: profile } = await supabase
        .from('user_profile')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

    if (!profile?.is_admin) {
        return { success: false, error: 'Sin permisos de administrador' };
    }

    const { error } = await supabase.from('mythic_songs').insert({
        track_id: song.trackId,
        track_name: song.trackName,
        artist_name: song.artistName,
        reason: song.reason || '',
        added_by: session.user.id,
    });

    if (error) {
        if (error.code === '23505') return { success: false, error: 'Esta canción ya es mítica' };
        return { success: false, error: error.message };
    }
    return { success: true };
}

export async function removeMythicSong(trackId: string): Promise<{ success: boolean; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'No autenticado' };

    const { error } = await supabase
        .from('mythic_songs')
        .delete()
        .eq('track_id', trackId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function getMythicSongs(): Promise<MythicSong[]> {
    const { data, error } = await supabase
        .from('mythic_songs')
        .select('track_id, track_name, artist_name, reason')
        .order('added_at', { ascending: false });

    if (error || !data) return [];
    return data.map(row => ({
        trackId: row.track_id,
        trackName: row.track_name,
        artistName: row.artist_name,
        reason: row.reason,
    }));
}

/**
 * Verifica si un track_id específico es mítico.
 * Usar en el generador de cartas para forzar rareza MYTHIC.
 */
export async function isMythicSong(trackId: string): Promise<boolean> {
    const { data } = await supabase
        .from('mythic_songs')
        .select('track_id')
        .eq('track_id', trackId)
        .maybeSingle();
    return !!data;
}

// Cache en memoria para no hacer una query por cada carta generada
let mythicCache: Set<string> | null = null;
let cacheExpiry = 0;

export async function getMythicTrackIds(): Promise<Set<string>> {
    const now = Date.now();
    if (mythicCache && now < cacheExpiry) return mythicCache;

    const { data } = await supabase
        .from('mythic_songs')
        .select('track_id');

    mythicCache = new Set((data || []).map(r => r.track_id));
    cacheExpiry = now + 5 * 60 * 1000; // Cache 5 minutos
    return mythicCache;
}
