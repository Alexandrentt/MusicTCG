// src/components/battle/SabotageIndicator.tsx

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SabotageType } from '@/types/abilities';
import { Ghost, Layers, Lock, RefreshCw, Slash, Zap } from 'lucide-react';

interface SabotageIndicatorProps {
    activeSabotages: SabotageType[];
    targetName?: string;
}

const SABOTAGE_META: Record<SabotageType, { icon: any; color: string; label: string }> = {
    SWAP: { icon: RefreshCw, color: 'text-orange-500', label: 'SWAP: Mazo Alterado' },
    REVERSE_DRAW: { icon: Layers, color: 'text-purple-500', label: 'REVERSE: Roba por B-Side' },
    ENCRYPT: { icon: Lock, color: 'text-red-500', label: 'ENCRYPT: Visión Bloqueada' },
    DUPLICATE: { icon: Zap, color: 'text-cyan-500', label: 'DUPLICATE: Doble Robo' },
    VOID: { icon: Ghost, color: 'text-zinc-500', label: 'VOID: Pistas Vacías' },
    NONE: { icon: Slash, color: 'text-white/20', label: '' },
};

export default function SabotageIndicator({ activeSabotages, targetName }: SabotageIndicatorProps) {
    if (activeSabotages.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 p-4">
            {targetName && <span className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2 mb-1">{targetName} Estatus:</span>}
            <AnimatePresence>
                {activeSabotages.map((s, idx) => {
                    const meta = SABOTAGE_META[s];
                    if (!meta.label) return null;

                    return (
                        <motion.div
                            key={s + idx}
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            className="flex items-center gap-4 bg-black/60 backdrop-blur-3xl border border-white/5 p-3 rounded-2xl group hover:border-white/20 transition-all hover:bg-black/80"
                        >
                            <div className={`p-2 rounded-lg bg-white/5 ${meta.color} group-hover:scale-110 transition-transform`}>
                                <meta.icon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[11px] font-black uppercase tracking-tighter italic ${meta.color}`}>{meta.label}</span>
                                <span className="text-[9px] text-white/20 uppercase font-black tracking-widest mt-0.5 group-hover:text-white/40">Efecto Activo</span>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
