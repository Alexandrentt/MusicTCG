// lib/favorites/favoriteService.ts
import { supabase } from '@/lib/supabase';

export interface FavoriteCard {
    cardId: string;
    addedAt: Date;
    userId?: string;
}

export class FavoriteService {
    /**
     * Agregar a favoritos
     */
    async addFavorite(
        userId: string,
        cardId: string
    ): Promise<void> {
        const { error } = await supabase.from('favorites').upsert({
            user_id: userId,
            card_id: cardId,
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
            addedAt: new Date(row.added_at),
        }));
    }

    /**
     * Verificar si es favorita
     */
    async isFavorite(userId: string, cardId: string): Promise<boolean> {
        const { data, error } = await supabase.from('favorites').select('card_id').match({ user_id: userId, card_id: cardId }).maybeSingle();
        if (error && error.code !== 'PGRST116') {
            console.error('Error checking favorite:', error);
            return false;
        }
        return !!data;
    }
}

export const favoriteService = new FavoriteService();
