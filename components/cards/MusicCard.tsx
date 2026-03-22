'use client';

import React, { useMemo } from 'react';
import { Zap, Shield, Swords, Droplets, Flame, Wind, Music, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

/**
 * Interface de Datos (Props) as requested by USER.
 */
export interface CardData {
    id: string;
    trackName: string;
    artistName: string;
    albumArtUrl: string;
    atk: number;
    def: number;
    energyCost: number; // 1-10
    rarity: 'Bronce' | 'Plata' | 'Oro' | 'Platino';
    genreMood: 'Sad' | 'Upbeat' | 'Aggressive' | 'Chill' | 'Dance';
    hasActiveSync: boolean; // Si la canción está sonando ahora mismo
}

interface MusicCardProps {
    data: CardData;
    onInspect?: (id: string) => void;
    bpm?: number;
}

/**
 * Minimalist Spotify-style Card Component for MusicTCG.
 * Designed to be ultra-lightweight, responsive and visual.
 */
export const MusicCard: React.FC<MusicCardProps> = ({
    data,
    onInspect,
    bpm = 120
}) => {
    const {
        trackName,
        artistName,
        albumArtUrl,
        atk,
        def,
        energyCost,
        rarity,
        genreMood,
        hasActiveSync
    } = data;

    // 1. Rareza Glow Colors
    const rarityConfig = useMemo(() => {
        switch (rarity) {
            case 'Bronce':
                return { color: '#A77044', label: 'BRONZE', glow: 'shadow-[0_0_20px_rgba(167,112,68,0.4)]' };
            case 'Plata':
                return { color: '#C0C0C0', label: 'SILVER', glow: 'shadow-[0_0_20px_rgba(192,192,192,0.4)]' };
            case 'Oro':
                return { color: '#D4AF37', label: 'GOLD', glow: 'shadow-[0_0_25px_rgba(212,175,55,0.6)]' };
            case 'Platino':
                return { color: '#E5E4E2', label: 'PLATINUM', glow: 'shadow-[0_0_30px_rgba(229,228,226,0.8)]', holo: true };
            default:
                return { color: '#A77044', label: 'BRONZE', glow: '' };
        }
    }, [rarity]);

    // 2. Mood Icons
    const MoodIcon = useMemo(() => {
        switch (genreMood) {
            case 'Sad': return Droplets;
            case 'Upbeat': return Sparkles;
            case 'Aggressive': return Flame;
            case 'Chill': return Wind;
            case 'Dance': return Music;
            default: return Music;
        }
    }, [genreMood]);

    // 3. Pulse Animation based on BPM
    const pulseDuration = useMemo(() => (60 / bpm).toFixed(2), [bpm]);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onInspect?.(data.id)}
            onContextMenu={(e) => {
                e.preventDefault();
                onInspect?.(data.id);
            }}
            className={`
        relative group cursor-pointer 
        w-full max-w-[240px] aspect-[2.5/3.8]
        bg-[#181818] rounded-2xl overflow-hidden
        border border-white/5 transition-all duration-300
        flex flex-col
        ${rarityConfig.glow}
        ${hasActiveSync ? 'ring-2 ring-white/20' : ''}
      `}
            style={{
                // Dynamic Pulse for On-Beat Sync
                animation: hasActiveSync ? `beat-pulse ${pulseDuration}s infinite ease-in-out` : 'none',
            }}
        >
            {/* Rarity Gradient Glow Overlay */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at bottom, ${rarityConfig.color}, transparent 70%)`
                }}
            />

            {/* Header: Energy Cost */}
            <div className="absolute top-3 left-3 z-30">
                <div className="w-8 h-8 rounded-full bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center">
                    <span className="text-white font-black text-sm">{energyCost}</span>
                </div>
            </div>

            {/* Body: Art (70%) */}
            <div className="relative h-[72%] w-full overflow-hidden">
                {albumArtUrl ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <Image
                            src={albumArtUrl}
                            alt={trackName}
                            fill
                            className="object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                            crossOrigin="anonymous"
                        />
                    </>
                ) : (
                    <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                        <Music className="w-12 h-12 text-white/10" />
                    </div>
                )}

                {/* Bottom Overlay for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />

                {/* Text Details (Integrated with Image) */}
                <div className="absolute bottom-4 left-4 right-4 z-20">
                    <h3 className="text-white font-bold text-lg leading-tight truncate drop-shadow-lg">
                        {trackName}
                    </h3>
                    <p className="text-white/60 text-sm font-medium truncate">
                        {artistName}
                    </p>
                </div>
            </div>

            {/* Footer: Stats and Mood (Flat Base) */}
            <div className="flex-1 px-4 flex items-center justify-between border-t border-white/5 bg-black/20">
                {/* Left: ATK/DEF */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 group/atk">
                        <Swords className="w-3.5 h-3.5 text-white/40 group-hover/atk:text-red-400 transition-colors" />
                        <span className="text-white/90 font-bold text-xs">{atk}</span>
                    </div>
                    <div className="flex items-center gap-1.5 group/def">
                        <Shield className="w-3.5 h-3.5 text-white/40 group-hover/def:text-blue-400 transition-colors" />
                        <span className="text-white/90 font-bold text-xs">{def}</span>
                    </div>
                </div>

                {/* Right: Mood Icon */}
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10">
                    <MoodIcon className="w-3.5 h-3.5 text-white/60" />
                </div>
            </div>

            {/* Platinum Holographic Effect */}
            {rarityConfig.holo && (
                <div className="absolute inset-0 z-10 pointer-events-none opacity-20 bg-gradient-to-tr from-cyan-500/20 via-pink-500/20 to-yellow-500/20 mix-blend-overlay animate-shimmer" />
            )}

            {/* Subtle Animation Styles */}
            <style jsx>{`
        @keyframes beat-pulse {
          0%, 100% { 
            transform: scale(1);
            filter: brightness(1);
            box-shadow: 0 0 20px ${rarityConfig.color}20;
          }
          50% { 
            transform: scale(1.01);
            filter: brightness(1.2);
            box-shadow: 0 0 40px ${rarityConfig.color}60;
          }
        }
        .animate-shimmer {
          background-size: 200% 200%;
          animation: holo-shine 4s linear infinite;
        }
        @keyframes holo-shine {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
      `}</style>
        </motion.div>
    );
};

export default MusicCard;
