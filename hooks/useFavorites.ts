// hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { favoriteService, FavoriteCard } from '@/lib/favorites/favoriteService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useFavorites() {
    const [favorites, setFavorites] = useState<FavoriteCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                setUserId(null);
                setFavorites([]);
                setLoading(false);
            }
        };
        
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                setUserId(null);
                setFavorites([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadFavorites = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const favs = await favoriteService.getFavorites(userId);
            setFavorites(favs);
        } catch (error) {
            console.error('Error loading favorites:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            loadFavorites();
        }
    }, [userId, loadFavorites]);

    const toggleFavorite = async (cardId: string) => {
        if (!userId) {
            toast.error('Debes iniciar sesión para guardar favoritas.');
            return;
        }

        const isFav = favorites.some((f) => f.cardId === cardId);
        try {
            if (isFav) {
                await favoriteService.removeFavorite(userId, cardId);
                setFavorites((prev) => prev.filter((f) => f.cardId !== cardId));
                toast.success('Eliminado de favoritas');
            } else {
                await favoriteService.addFavorite(userId, cardId);
                const newFav: FavoriteCard = {
                    cardId,
                    addedAt: new Date(),
                    userId,
                };
                setFavorites((prev) => [...prev, newFav]);
                toast.success('Agregado a favoritas');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            toast.error('Error al actualizar favoritas');
        }
    };

    const isFavorite = (cardId: string) => {
        return favorites.some((f) => f.cardId === cardId);
    };

    return { favorites, loading, toggleFavorite, isFavorite, refresh: loadFavorites };
}
