// components/battle/PlaylistView.tsx

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlaylistStack, CardState } from '@/types/playlist';
import PlaylistStackComponent from './PlaylistStack';
import { Music, Plus, Zap, AlertCircle } from 'lucide-react';

interface PlaylistViewProps {
    playerPlaylist: PlaylistStack[];
    rivalPlaylist: PlaylistStack[];
    playerEnergy: { current: number; max: number };
    onCardSelect?: (cardId: string, stackId: string) => void;
    isPlayerTurn: boolean;
    onSacrifice?: () => void;
    sacrificeUsed: number;
}

export default function PlaylistView({
    playerPlaylist,
    rivalPlaylist,
    playerEnergy,
    onCardSelect,
    isPlayerTurn,
    onSacrifice,
    sacrificeUsed,
}: PlaylistViewProps) {
    const [expandedStack, setExpandedStack] = useState<string | null>(null);

    return (
        <div className="bg-black/80 backdrop-blur-3xl border-t border-white/10 p-4 md:p-8 rounded-t-[4rem] shadow-[0_-50px_100px_rgba(0,0,0,0.8)]">
            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* RIVAL PLAYLIST (Escenario del Oponente) */}
            {/* ════════════════════════════════════════════════════════════════════ */}

            <div className="mb-20">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Music className="w-5 h-5 text-red-500/50" />
                        CONCIERTO RIVAL
                    </h3>
                    <div className="h-[1px] flex-1 mx-6 bg-gradient-to-r from-red-500/20 to-transparent" />
                </div>

                {rivalPlaylist.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]"
                    >
                        <AlertCircle className="w-10 h-10 text-white/10 mb-2" />
                        <p className="text-white/20 font-bold uppercase text-[10px] tracking-widest">Esperando setlist rival...</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-2">
                        <AnimatePresence mode="popLayout">
                            {rivalPlaylist.map((stack) => (
                                <PlaylistStackComponent
                                    key={stack.stackId}
                                    stack={stack}
                                    isExpanded={expandedStack === stack.stackId}
                                    onToggleExpand={() =>
                                        setExpandedStack(
                                            expandedStack === stack.stackId ? null : stack.stackId
                                        )
                                    }
                                    isPlayerTurn={false}
                                    onCardSelect={onCardSelect}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* HUD CENTRAL (Energía y Control) */}
            {/* ════════════════════════════════════════════════════════════════════ */}

            <div className="relative z-50 py-10">
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-40 bg-cyan-500/10 blur-[100px] -z-10 rounded-full" />

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20">
                    {/* Energy Module */}
                    <div className="flex items-center gap-10">
                        <div className="text-center">
                            <span className="block text-[10px] font-black text-cyan-400 mb-2 tracking-[0.2em] uppercase">Corriente</span>
                            <div className="text-6xl font-black text-white tabular-nums drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                                {playerEnergy.current}
                            </div>
                        </div>

                        <div className="h-20 w-[1px] bg-white/20" />

                        <div className="text-center">
                            <span className="block text-[10px] font-black text-white/40 mb-2 tracking-[0.2em] uppercase">Capacidad Max</span>
                            <div className="text-6xl font-black text-white/20 tabular-nums">
                                {playerEnergy.max}
                            </div>
                        </div>
                    </div>

                    {/* Visual Bar */}
                    <div className="flex-1 max-w-xl w-full">
                        <div className="h-6 w-full bg-white/5 rounded-full border border-white/10 overflow-hidden relative shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(playerEnergy.current / playerEnergy.max) * 100}%` }}
                                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_30px_rgba(34,211,238,0.8)] relative"
                            >
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                                <motion.div
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2"
                                />
                            </motion.div>
                        </div>

                        <div className="flex justify-between mt-4">
                            <div className="flex items-center gap-3">
                                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                                <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Energía Sincronizada</span>
                            </div>
                            {isPlayerTurn && sacrificeUsed === 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(249, 115, 22, 0.4)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onSacrifice}
                                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-full text-[10px] font-black text-white tracking-widest uppercase flex items-center gap-2 border border-orange-400/50"
                                >
                                    <Plus className="w-3 h-3" />
                                    Aumentar Capacidad (Sacrificio)
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* PLAYER PLAYLIST (Tu Setlist en Escenario) */}
            {/* ════════════════════════════════════════════════════════════════════ */}

            <div className="mt-10">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Music className="w-5 h-5 text-cyan-500/50" />
                        TU SETLIST EN ESCENARIO
                    </h3>
                    <div className="h-[1px] flex-1 mx-6 bg-gradient-to-r from-cyan-500/20 to-transparent" />
                </div>

                {playerPlaylist.length === 0 ? (
                    <motion.div
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        className="group flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01] transition-all"
                    >
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 group-hover:border-cyan-500/50 transition-all duration-500">
                            <Plus className="w-8 h-8 text-white/20 group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <p className="text-white/20 font-black uppercase text-[10px] tracking-widest group-hover:text-white transition-colors">Suelta cartas aquí para empezar el concierto</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 p-4">
                        <AnimatePresence mode="popLayout">
                            {playerPlaylist.map((stack) => (
                                <PlaylistStackComponent
                                    key={stack.stackId}
                                    stack={stack}
                                    isExpanded={expandedStack === stack.stackId}
                                    onToggleExpand={() =>
                                        setExpandedStack(
                                            expandedStack === stack.stackId ? null : stack.stackId
                                        )
                                    }
                                    isPlayerTurn={isPlayerTurn}
                                    onCardSelect={onCardSelect}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
