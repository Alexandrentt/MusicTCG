// src/components/battle/ComboDetector.tsx

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CardData } from '@/lib/engine/generator';
import { Sparkles, Zap, Flame, Star } from 'lucide-react';

interface ComboDetectorProps {
    playerHand: CardData[];
    playerBoard: CardData[];
}

interface Combo {
    id: string;
    name: string;
    description: string;
    icon: any;
    color: string;
}

export default function ComboDetector({ playerHand, playerBoard }: ComboDetectorProps) {
    // Mock logic: SI hay 3 o más cartas del mismo género en board/mano -> Combo
    const genreCount = playerBoard.concat(playerHand).reduce((acc: Record<string, number>, card) => {
        acc[card.genre] = (acc[card.genre] || 0) + 1;
        return acc;
    }, {});

    const activeCombos: Combo[] = [];

    Object.entries(genreCount).forEach(([genre, count]) => {
        if (count >= 3) {
            activeCombos.push({
                id: `combo_${genre}`,
                name: `${genre.toUpperCase()} DOMINANCE`,
                description: `Sinergia de género activada: +3 Hype cada turno.`,
                icon: Flame,
                color: 'text-orange-500'
            });
        }
    });

    if (activeCombos.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Combos Potenciales</h4>
            </div>

            <AnimatePresence>
                {activeCombos.map((combo, idx) => (
                    <motion.div
                        key={combo.id + idx}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="relative overflow-hidden group bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-3xl p-6 hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all"
                    >
                        <div className="flex items-center gap-5 relative z-10">
                            <div className={`p-4 rounded-[2rem] bg-white/5 ${combo.color} group-hover:scale-110 transition-transform group-hover:rotate-12`}>
                                <combo.icon className="w-8 h-8" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h5 className={`text-xl font-black italic tracking-tighter uppercase leading-none ${combo.color}`}>{combo.name}</h5>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-normal max-w-[150px]">{combo.description}</p>
                            </div>
                        </div>

                        {/* Glitch Overlay Effect */}
                        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent group-hover:opacity-100 opacity-0 transition-opacity" />
                        <motion.div
                            animate={{ opacity: [0, 0.2, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 bg-white group-hover:block hidden pointer-events-none mix-blend-overlay"
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
