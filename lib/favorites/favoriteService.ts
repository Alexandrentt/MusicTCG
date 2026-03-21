// lib/favorites/favoriteService.ts
import { supabase } from '@/lib/supabase';

export interface FavoriteCard {
    cardId: string;
    addedAt: Date;
    notes?: string;
    userId?: string;
}

export class FavoriteService {
    /**
     * Agregar a favoritos
     */
    async addFavorite(
        userId: string,
        cardId: string,
        notes?: string
    ): Promise<void> {
        const { error } = await supabase.from('favorites').upsert({
            user_id: userId,
            card_id: cardId,
            notes: notes || '',
            added_at: new Date().toISOString()
        });
        if (error) throw error;
        console.log('✅ Card added to favorites:', cardId);
    }

    /**
     * Remover de favoritos
     */
    async removeFavorite(userId: string, cardId: string): Promise<void> {
        const { error } = await supabase.from('favorites').delete().match({ user_id: userId, card_id: cardId });
        if (error) throw error;
        console.log('✅ Card removed from favorites:', cardId);
    }

    /**
     * Obtener todas las favoritas
     */
    async getFavorites(userId: string): Promise<FavoriteCard[]> {
        const { data, error } = await supabase.from('favorites').select('*').eq('user_id', userId);
        if (error) throw error;

        return (data || []).map((row) => ({
            userId: row.user_id,
            cardId: row.card_id,
            notes: row.notes,
            addedAt: new Date(row.added_at),
        }));
    }

    /**
     * Verificar si es favorita
     */
    async isFavorite(userId: string, cardId: string): Promise<boolean> {
        const { data, error } = await supabase.from('favorites').select('id').match({ user_id: userId, card_id: cardId }).single();
        if (error && error.code !== 'PGRST116') {
            console.error('Error checking favorite:', error);
            return false;
        }
        return !!data;
    }
}

export const favoriteService = new FavoriteService();
