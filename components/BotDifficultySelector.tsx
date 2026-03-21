'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BotDifficulty } from '@/types/multiplayer';
import { MasterCardTemplate } from '@/types/types';
import { Shield, Brain, Zap, Crown } from 'lucide-react';

interface BotDifficultySelectorProps {
    selectedDeck: MasterCardTemplate[];
    onSelectDifficulty: (difficulty: BotDifficulty) => void;
    onStartMatch: () => void;
    isLoading: boolean;
    deckPowerScore: number;
}

export default function BotDifficultySelector({
    selectedDeck,
    onSelectDifficulty,
    isLoading,
    deckPowerScore,
}: BotDifficultySelectorProps) {
    const difficulties = [
        {
            id: BotDifficulty.EASY,
            name: 'EASY',
            desc: 'Bot principiante. Ideal para probar mazos.',
            icon: <Shield className="w-8 h-8 mb-2 text-green-400" />,
            colorStart: 'from-green-500/20',
            colorEnd: 'to-emerald-600/20',
            border: 'border-green-500/50',
            hoverBorder: 'hover:border-green-400',
            expectedPower: Math.max(0, deckPowerScore - 20)
        },
        {
            id: BotDifficulty.NORMAL,
            name: 'NORMAL',
            desc: 'Bot equilibrado. Se adapta a tu nivel.',
            icon: <Brain className="w-8 h-8 mb-2 text-blue-400" />,
            colorStart: 'from-blue-500/20',
            colorEnd: 'to-cyan-600/20',
            border: 'border-blue-500/50',
            hoverBorder: 'hover:border-blue-400',
            expectedPower: deckPowerScore
        },
        {
            id: BotDifficulty.HARD,
            name: 'HARD',
            desc: 'Bot estratégico. Busca sinergias y combos.',
            icon: <Zap className="w-8 h-8 mb-2 text-orange-400" />,
            colorStart: 'from-orange-500/20',
            colorEnd: 'to-red-600/20',
            border: 'border-orange-500/50',
            hoverBorder: 'hover:border-orange-400',
            expectedPower: Math.min(100, deckPowerScore + 15)
        },
        {
            id: BotDifficulty.IMPOSSIBLE,
            name: 'IMPOSSIBLE',
            desc: 'Bot Imparable. IA despiadada, no perdona errores.',
            icon: <Crown className="w-8 h-8 mb-2 text-purple-400" />,
            colorStart: 'from-purple-500/20',
            colorEnd: 'to-pink-600/20',
            border: 'border-purple-500/50',
            hoverBorder: 'hover:border-purple-400',
            expectedPower: Math.min(100, deckPowerScore + 30)
        },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Selecciona la dificultad de la IA</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {difficulties.map((diff) => (
                    <motion.button
                        key={diff.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        onClick={() => onSelectDifficulty(diff.id)}
                        className={`relative overflow-hidden p-6 rounded-xl border ${diff.border} ${diff.hoverBorder} 
              bg-gradient-to-br ${diff.colorStart} ${diff.colorEnd} 
              transition-colors duration-300 text-left flex flex-col items-center justify-center
              disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {diff.icon}
                        <span className="font-bold text-lg text-white mb-2">{diff.name}</span>
                        <span className="text-sm text-white/70 text-center mb-4">{diff.desc}</span>
                        <div className="w-full mt-auto bg-black/40 rounded p-2 text-center border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">Poder Estimado del Bot</span>
                            <span className="font-mono text-cyan-400 font-bold">{diff.expectedPower} / 100</span>
                        </div>
                    </motion.button>
                ))}
            </div>

            {isLoading && (
                <div className="text-center text-cyan-400 animate-pulse mt-4">
                    Generando oponente...
                </div>
            )}
        </div>
    );
}
