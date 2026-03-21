// src/components/battle/DeckPreviewWindow.tsx

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import { Eye, Ghost, Lock, X } from 'lucide-react';

interface DeckPreviewWindowProps {
    cards: CardData[];
    isOpen: boolean;
    onClose: () => void;
    isEncrypted?: boolean;
}

export default function DeckPreviewWindow({ cards, isOpen, onClose, isEncrypted }: DeckPreviewWindowProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        className="w-full max-w-6xl bg-zinc-900 border border-white/10 rounded-[3rem] p-12 overflow-hidden relative"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    {isEncrypted ? <Lock className="w-6 h-6 text-red-500" /> : <Eye className="w-6 h-6 text-cyan-400" />}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Planificación Futura</h2>
                                    <p className="text-xs text-white/40 font-bold tracking-widest uppercase">
                                        {isEncrypted ? 'Señal Encriptada - No puedes visualizar' : `Próximas ${cards.length} pistas en tu mazo`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        {/* Grid de cartas */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                            {isEncrypted ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="aspect-[2/3] bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center opacity-50 relative overflow-hidden group">
                                        <Ghost className="w-12 h-12 text-red-500/20 group-hover:scale-125 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                                        <p className="mt-4 text-[9px] font-black text-red-500/40 uppercase tracking-widest">Encriptado</p>
                                    </div>
                                ))
                            ) : (
                                cards.map((card, idx) => (
                                    <motion.div
                                        key={card.id + idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="relative group"
                                    >
                                        <div className="absolute -top-4 -left-2 w-8 h-8 rounded-full bg-cyan-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-zinc-900 group-hover:scale-110 transition-transform">
                                            #{idx + 1}
                                        </div>
                                        <Card data={card} />
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer Instruction */}
                        <div className="mt-12 pt-8 border-t border-white/5 text-center">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em]">
                                Usa DJ Shuffle para cambiar el orden si nada te convence
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
