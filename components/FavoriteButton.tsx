// components/FavoriteButton.tsx
'use client';

import { useFavorites } from '@/hooks/useFavorites';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FavoriteButtonProps {
    cardId: string;
    size?: number;
    showText?: boolean;
    isOwned?: boolean;
}

export function FavoriteButton({ cardId, size = 20, showText = false, isOwned = false }: FavoriteButtonProps) {
    const { isFavorite, toggleFavorite, loading } = useFavorites();
    const active = isFavorite(cardId);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFavorite(cardId);
    };

    if (loading) return <div className="w-6 h-6 animate-pulse bg-gray-600 rounded-full" />;

    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClick}
            className={`flex items-center gap-2 transition-all p-2 rounded-full relative ${active
                ? isOwned
                    ? 'text-pink-500 bg-pink-500/10 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                    : 'text-purple-400 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            aria-label="Toggle Favorite"
        >
            <Heart
                size={size}
                fill={active ? 'currentColor' : 'none'}
                strokeWidth={active ? (isOwned ? 0 : 2) : 2}
                className={active && !isOwned ? 'animate-pulse' : ''}
            />
            {showText && (
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {active ? isOwned ? 'Owned Favorite' : 'Wishlist' : 'Favorite'}
                </span>
            )}

            {/* Minimalist marker for Owned Favorite */}
            {active && isOwned && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full border border-black shadow-sm" />
            )}
        </motion.button>
    );
}
