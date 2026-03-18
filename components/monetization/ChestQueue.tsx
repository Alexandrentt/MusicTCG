// components/monetization/ChestQueue.tsx

'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { ChestType, formatTimeRemaining } from '@/lib/monetization/chestSystem';
import { Zap, Timer, Package, Lock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChestQueue() {
    const {
        chestQueue,
        maxChestSlots,
        startChestUnlock,
        openChest,
        accelerateChest,
        updateChestTimers,
        premiumGold
    } = usePlayerStore();

    const [time, setTime] = useState(Date.now());

    // Update timers cada segundo para la UI
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(Date.now());
            updateChestTimers();
        }, 1000);
        return () => clearInterval(interval);
    }, [updateChestTimers]);

    const getChestIcon = (type: ChestType) => {
        switch (type) {
            case ChestType.COMMON: return <Package className="w-8 h-8 text-gray-400" />;
            case ChestType.RARE: return <Package className="w-8 h-8 text-blue-400" />;
            case ChestType.EPIC: return <Package className="w-8 h-8 text-purple-400" />;
            case ChestType.LEGENDARY: return <Package className="w-8 h-8 text-yellow-500" />;
            default: return <Package className="w-8 h-8" />;
        }
    };

    const getChestColor = (type: ChestType) => {
        switch (type) {
            case ChestType.COMMON: return 'from-gray-600/20 to-gray-800/40 border-gray-500/30';
            case ChestType.RARE: return 'from-blue-600/20 to-blue-800/40 border-blue-500/30';
            case ChestType.EPIC: return 'from-purple-600/20 to-purple-800/40 border-purple-500/30';
            case ChestType.LEGENDARY: return 'from-yellow-500/20 to-yellow-700/40 border-yellow-500/30';
            default: return 'from-gray-600/20 to-gray-800/40 border-gray-500/30';
        }
    };

    const isAnyUnlocking = chestQueue.some(c => c.status === 'UNLOCKING');

    return (
        <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    Tus Cofres <span className="text-xs font-medium text-gray-500">({chestQueue.length}/{maxChestSlots})</span>
                </h3>
                <div className="bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                    <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-yellow-200">{premiumGold}</span>
                </div>
            </div>

            {chestQueue.length === 0 ? (
                <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <div className="text-4xl mb-4 opacity-30">✨</div>
                    <p className="text-sm text-gray-400 font-medium">No tienes cofres pendientes.</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Gana batallas para recibir cofres</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                        {chestQueue.map((chest) => {
                            const isReady = chest.status === 'READY';
                            const isUnlocking = chest.status === 'UNLOCKING';

                            return (
                                <motion.div
                                    key={chest.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`relative bg-gradient-to-br ${getChestColor(chest.type)} rounded-xl p-4 border transition-all duration-300 group cursor-default`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Icono */}
                                        <div className="shrink-0 relative">
                                            {getChestIcon(chest.type)}
                                            {isReady && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-black animate-pulse"><CheckCircle className="w-3 h-3 text-white" /></div>}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-white text-xs uppercase tracking-wider mb-1">
                                                Cofre {chest.type}
                                            </div>

                                            {isReady ? (
                                                <div className="text-[10px] text-green-400 font-black uppercase tracking-tighter animate-pulse">
                                                    Listo para abrir
                                                </div>
                                            ) : isUnlocking ? (
                                                <div className="flex items-center gap-1.5 text-xs text-blue-300 font-mono">
                                                    <Timer className="w-3 h-3 animate-spin" />
                                                    {formatTimeRemaining(chest.timeRemainingMs)}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-500 font-bold uppercase">
                                                    Cerrado
                                                </div>
                                            )}
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex flex-col gap-2">
                                            {isReady ? (
                                                <button
                                                    onClick={() => openChest(chest.id)}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all"
                                                >
                                                    Revelar
                                                </button>
                                            ) : isUnlocking ? (
                                                <button
                                                    onClick={() => accelerateChest(chest.id)}
                                                    disabled={premiumGold < chest.accelerateCost}
                                                    className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-2 group/btn"
                                                >
                                                    <Zap className="w-3 h-3 text-yellow-400 group-hover/btn:scale-125 transition-transform" />
                                                    {chest.accelerateCost}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => startChestUnlock(chest.id)}
                                                    disabled={isAnyUnlocking}
                                                    className="px-4 py-2 bg-blue-600/40 hover:bg-blue-600/60 disabled:opacity-20 border border-blue-500/50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Abrir
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar for unlocking */}
                                    {isUnlocking && (
                                        <div className="mt-3 w-full bg-black/40 rounded-full h-1 overflow-hidden border border-white/5">
                                            <div
                                                className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 linear"
                                                style={{ width: `${(chest.timeRemainingMs / (4 * 60 * 60 * 1000)) * 100}%` }} // Approximate relative to common/rare
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Slots vacíos */}
            {chestQueue.length < maxChestSlots && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: maxChestSlots - chestQueue.length }).map((_, i) => (
                        <div key={i} className="border-2 border-dashed border-white/5 bg-white/[0.02] rounded-xl h-16 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-white/10" />
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                    <Package className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                        <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Estrategia</p>
                        <p className="text-[10px] text-gray-400 leading-tight">Gana batallas para recibir cofres. Solo uno se abre a la vez.</p>
                    </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                    <Zap className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div>
                        <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Aceleración</p>
                        <p className="text-[10px] text-gray-400 leading-tight">Usa Oro Premium para revelar las cartas sin esperar el timer.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
