'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Zap, Shield } from 'lucide-react';
import { PlaylistCard } from '@/types/playlist';
import Image from 'next/image';

interface PlaylistCardProps {
    card: PlaylistCard;
    atkBonus?: number;
    defBonus?: number;
    onClick?: () => void;
    compact?: boolean;
}

export default function PlaylistCardComponent({
    card,
    atkBonus = 0,
    defBonus = 0,
    onClick,
    compact = false
}: PlaylistCardProps) {
    const { cardData, currentDef, state } = card;

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative rounded-lg overflow-hidden border border-white/20 bg-black/40 ${compact ? 'p-2' : 'p-3'} cursor-pointer transition-all hover:border-cyan-500/50`}
        >
            <div className="flex flex-col gap-2">
                {/* Artwork & Header */}
                <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <Image
                        src={cardData.artworkUrl}
                        alt={cardData.name}
                        fill
                        className={`object-cover ${state === 'TAPPED' ? 'grayscale opacity-50' : ''}`}
                    />
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/20">
                        <span className="text-[10px] font-bold text-white">Cost {cardData.cost}</span>
                    </div>
                </div>

                {/* Title */}
                <div className="min-h-[2.5rem]">
                    <h4 className="text-xs font-bold text-white truncate">{cardData.name}</h4>
                    <p className="text-[10px] text-white/50 truncate">{cardData.artist}</p>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center bg-white/5 rounded p-1">
                    <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-cyan-400" />
                        <span className="text-xs font-bold text-white">{cardData.atk + atkBonus}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs font-bold text-white">{currentDef + defBonus}</span>
                    </div>
                </div>
            </div>

            {state === 'TAPPED' && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-black/60 px-2 py-1 rounded-full border border-white/20">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Agotada</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
