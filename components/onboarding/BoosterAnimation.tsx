'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, Shield, Plus, Lock } from 'lucide-react';
import { addCardsToInventory } from '@/lib/guest/guestManager';

interface BoosterAnimationProps {
    stageNumber: number;
    onComplete: () => void;
}

export default function BoosterAnimation({ stageNumber, onComplete }: BoosterAnimationProps) {
    const [status, setStatus] = useState<'IDLE' | 'OPENING' | 'REVEALING' | 'DONE'>('IDLE');
    const [cardsCount, setCardsCount] = useState(0);

    useEffect(() => {
        // Definimos cuántas cartas se asignan en cada etapa
        const timer = setTimeout(() => setCardsCount(stageNumber === 1 ? 40 : 5), 0);
        return () => clearTimeout(timer);
    }, [stageNumber]);

    const handleOpenBooster = async () => {
        setStatus('OPENING');

        // Simulamos la apertura lenta con vibración
        await new Promise(resolve => setTimeout(resolve, 3000));

        setStatus('REVEALING');

        // Simulación de guardado de cartas en el guest manager (asíncrono)
        // En producción aquí iría una llamada a un engine de cartas reales aleatorias
        const mockCardIds = Array.from({ length: cardsCount }, (_, i) => `card_tutorial_${stageNumber}_${i}`);
        await addCardsToInventory(mockCardIds);

        await new Promise(resolve => setTimeout(resolve, 5000));
        setStatus('DONE');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black/90 p-8 text-center relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-black -z-10 origin-center scale-[1.5]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full aspect-square bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.1),transparent_60%)] animate-pulse" />
            </div>

            <AnimatePresence mode="wait">
                {status === 'IDLE' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="z-10 flex flex-col items-center gap-12"
                    >
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                                🔥 {stageNumber === 1 ? "RECIBE TU SETLIST INICIAL" : "RECOMPENSA POR VICTORIA"}
                            </h2>
                            <p className="text-sm text-cyan-400 font-black tracking-widest uppercase">Tocado por el destino: {cardsCount} cartas nuevas</p>
                        </div>

                        {/* Booster Visual placeholder (Sleek card stack) */}
                        <div className="relative w-64 h-96 group perspective-1000">
                            <div className="absolute inset-x-0 bottom-0 h-4 w-full bg-cyan-950/50 blur-2xl rounded-full" />
                            <motion.div
                                animate={{
                                    y: [0, -15, 0],
                                    rotate: [0, 2, -1, 0],
                                    scale: [1, 1.05, 1]
                                }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                className="relative w-full h-full bg-gradient-to-br from-indigo-600 via-purple-700 to-black rounded-[2rem] border-4 border-white/20 shadow-[0_40px_100px_rgba(147,51,234,0.4)] overflow-hidden flex flex-col p-8"
                            >
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                                <div className="flex justify-between items-start relative z-10">
                                    <Lock className="w-8 h-8 text-white/40" />
                                    <div className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                </div>

                                <div className="mt-auto relative z-10">
                                    <h3 className="text-6xl font-black text-white italic tracking-tighter mix-blend-overlay opacity-30">TCG</h3>
                                    <div className="h-2 w-12 bg-white/50 rounded-full mt-4" />
                                </div>
                            </motion.div>
                        </div>

                        <button
                            onClick={handleOpenBooster}
                            className="px-16 py-6 bg-cyan-500 text-white font-black uppercase tracking-[0.3em] overflow-hidden group relative transform transition hover:scale-110 active:scale-95"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                Abrir Sobre <Sparkles className="w-5 h-5" />
                            </span>
                            <div className="absolute inset-0 bg-white translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 will-change-transform mix-blend-overlay" />
                        </button>
                    </motion.div>
                )}

                {status === 'OPENING' && (
                    <motion.div
                        key="opening"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="z-10 flex flex-col items-center justify-center gap-6"
                    >
                        <div className="w-24 h-24 border-8 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_50px_rgba(34,211,238,0.5)]" />
                        <h4 className="text-xl font-black text-white italic tracking-widest uppercase animate-pulse">Desbloqueando Pack...</h4>
                    </motion.div>
                )}

                {status === 'REVEALING' && (
                    <motion.div
                        key="revealing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="z-20 min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
                    >
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[100vw] h-[100vw] bg-white rounded-full scale-[0.01] animate-ping opacity-20" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 mt-20 max-w-7xl mx-auto px-10">
                            {Array.from({ length: Math.min(cardsCount, 20) }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 300, rotate: i * 5, scale: 0 }}
                                    animate={{ opacity: 1, y: 0, rotate: (i - 10) * 2, scale: 1 }}
                                    transition={{
                                        type: "spring",
                                        delay: i * 0.05,
                                        stiffness: 100
                                    }}
                                    className="aspect-[2/3] bg-gradient-to-br from-white/20 to-transparent border border-white/20 rounded-lg shadow-2xl backdrop-blur-md flex flex-col items-center justify-center relative group"
                                >
                                    <Zap className="w-8 h-8 text-white/10 group-hover:text-cyan-400 group-hover:scale-125 transition-all" />
                                    <div className="absolute bottom-2 left-2 right-2 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-500/50 w-[70%]" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-20 space-y-4">
                            <h3 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">¡BOOSTER RECORRIDO!</h3>
                            <p className="text-sm text-white/50 font-black tracking-widest uppercase">Has adquirido {cardsCount} cartas al total de tu colección invitada.</p>
                        </div>
                    </motion.div>
                )}

                {status === 'DONE' && (
                    <motion.div
                        key="done"
                        className="z-30 text-center"
                    >
                        <h2 className="text-8xl font-black text-cyan-400 italic mb-10 drop-shadow-[0_0_30px_rgba(34,211,238,0.3)] tracking-tighter">¡COMPLETADO!</h2>
                        <button
                            onClick={onComplete}
                            className="px-20 py-8 bg-white text-black font-black uppercase tracking-[0.5em] text-xl transform hover:scale-110 transition-all hover:bg-cyan-500 hover:text-white"
                        >
                            Continuar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
