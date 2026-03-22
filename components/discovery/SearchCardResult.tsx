// components/discovery/SearchCardResult.tsx

'use client';

import React from 'react';
import { motion } from 'motion/react';
import { SearchResult } from '@/lib/search/searchEngine';
import { Zap, Shield, Music } from 'lucide-react';
import { FavoriteButton } from '@/components/FavoriteButton';
import { usePlayerStore } from '@/store/usePlayerStore';

interface SearchCardResultProps {
    result: SearchResult;
    isSelected: boolean;
    onClick: () => void;
    isOwned?: boolean; // Prop to override internal ownership check
    className?: string; // Prop to pass custom classes
    onArtistClick?: (artist: string) => void;
}

export default function SearchCardResult({
    result,
    isSelected,
    onClick,
    isOwned: isOwnedProp,
    className = "",
    onArtistClick,
}: SearchCardResultProps) {
    const { cardData } = result;
    const { inventory } = usePlayerStore();

    // Use prop if provided, otherwise check inventory
    const isOwned = isOwnedProp !== undefined ? isOwnedProp : (cardData ? !!inventory[cardData.id] : false);
    const ownedItem = cardData ? inventory[cardData.id] : null;
    const ownedCount = isOwned ? (ownedItem?.count || 1) : 0;

    const renderStudioCounter = () => {
        if (ownedCount <= 0) return null;
        return (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-20">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-1.5 h-1.5 rotate-45 border border-white/20 transition-all ${i < ownedCount ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'bg-black/40 opacity-20'}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <motion.div
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-full group cursor-pointer transition-all ${isSelected ? 'ring-2 ring-cyan-500' : ''
                } ${ownedCount > 0 ? '' : 'opacity-90'} ${className}`}
        >
            {/* Studio Counter (Diamonds) */}
            {renderStudioCounter()}

            {/* Card visual */}
            <div className={`relative aspect-[2/3] rounded-lg overflow-hidden border transition-all duration-300 ${isSelected ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-white/10 shadow-xl'
                } bg-[#1a1a1a]`}>
                {/* Artwork */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${result.artworkUrl})` }}
                >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90" />
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col justify-between p-2.5">
                    {/* Top: Cost + Favorite */}
                    <div className="flex justify-between items-start">
                        {cardData && (
                            <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <span className="text-xs font-black text-white">
                                    {cardData.cost}
                                </span>
                            </div>
                        )}

                        <FavoriteButton
                            cardId={cardData?.id || `${result.artist}-${result.name}`.replace(/\s+/g, '_')}
                            size={14}
                            isOwned={ownedCount > 0}
                        />
                    </div>

                    {/* Bottom: Match Score + Stats + Info */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                            {/* Stats */}
                            {cardData && cardData.type === 'CREATURE' && (
                                <div className="flex gap-1.5 text-white">
                                    <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/5 text-[10px] font-black">
                                        <Zap className="w-2.5 h-2.5 text-cyan-400" />
                                        {cardData.atk}
                                    </div>
                                    <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/5 text-[10px] font-black">
                                        <Shield className="w-2.5 h-2.5 text-cyan-400" />
                                        {cardData.def}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name + Artist */}
                        <div className="text-left border-t border-white/5 pt-1.5">
                            <h3 className="font-black text-white text-[11px] leading-tight line-clamp-1 uppercase tracking-tighter">
                                {result.name}
                            </h3>
                            <p
                                className={`text-white/50 text-[9px] line-clamp-1 font-bold ${onArtistClick ? 'hover:underline cursor-pointer hover:text-white transition-colors' : ''}`}
                                onClick={(e) => {
                                    if (onArtistClick) {
                                        e.stopPropagation();
                                        onArtistClick(result.artist);
                                    }
                                }}
                            >
                                {result.artist}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ownership Glow */}
                {ownedCount > 0 && (
                    <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[8px] font-black px-4 py-0.5 rotate-45 translate-x-3 translate-y-1 shadow-md">
                            OWNED
                        </div>
                    </div>
                )}
            </div>

            {/* Metadata (Genre / Match) */}
            <div className="mt-2 px-1 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-white/50 uppercase tracking-widest font-black">
                    <span className="truncate max-w-[70px]">{result.genre}</span>
                </div>
                {result.rarity && (
                    <div
                        className={`text-[10px] font-black italic tracking-tighter ${result.rarity === 'PLATINUM'
                            ? 'text-cyan-400'
                            : result.rarity === 'GOLD'
                                ? 'text-yellow-400'
                                : result.rarity === 'SILVER'
                                    ? 'text-slate-400'
                                    : 'text-orange-800'
                            }`}
                    >
                        {result.rarity}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
