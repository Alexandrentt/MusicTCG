// components/store/PackOpenModal.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, ChevronRight, Zap } from 'lucide-react';
import { CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import CardBack from '@/components/CardBack';

export interface OpenedCardItem {
    card: CardData;
    isDuplicate: boolean;
    revealed: boolean;
}

interface PackOpenModalProps {
    cards: OpenedCardItem[];
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    onRevealCard: (index: number) => void;
    onRevealAll: () => Promise<void>;
    isRevealingAll?: boolean;
}

function FlipCard({
    item,
    index,
    onReveal,
}: {
    item: OpenedCardItem;
    index: number;
    onReveal: (i: number) => void;
}) {
    const isRare = item.card.rarity === 'GOLD' || item.card.rarity === 'PLATINUM' || item.card.rarity === 'MYTHIC';
    const isMythic = item.card.rarity === 'MYTHIC';

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 22 }}
            className="relative perspective-1000 cursor-pointer shrink-0"
            onClick={() => !item.revealed && onReveal(index)}
        >
            {/* Aura mítica */}
            {isMythic && item.revealed && (
                <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -inset-3 rounded-2xl blur-lg pointer-events-none z-0"
                    style={{ background: 'rgba(168,85,247,0.5)' }}
                />
            )}

            {/* Contenedor 3D */}
            <div
                className="preserve-3d transition-all duration-700 relative z-10"
                style={{
                    transform: item.revealed ? 'rotateY(0deg)' : 'rotateY(180deg)',
                    width: 'clamp(130px, 28vw, 200px)',
                    aspectRatio: '2.5 / 3.5',
                }}
            >
                {/* Frente */}
                <div className="absolute inset-0 backface-hidden rounded-xl overflow-hidden">
                    <Card data={item.card} className="w-full h-full" disableHover={!item.revealed} />
                    {item.isDuplicate && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full z-20 border border-black shadow-lg">
                            +COMODÍN
                        </div>
                    )}
                </div>

                {/* Reverso */}
                <div
                    className="absolute inset-0 backface-hidden rounded-xl overflow-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                >
                    <CardBack className="w-full h-full" isRare={isRare} size="full" />
                    {!item.revealed && (
                        <div className="absolute inset-0 flex items-end justify-center pb-3">
                            <span className="text-[9px] text-white/60 font-black uppercase tracking-widest animate-pulse">
                                Toca para revelar
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Aura de rareza post-reveal */}
            {isRare && !isMythic && item.revealed && (
                <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -inset-1 rounded-xl blur-sm pointer-events-none z-0"
                    style={{
                        background: item.card.rarity === 'PLATINUM'
                            ? 'rgba(0,255,255,0.25)'
                            : 'rgba(255,215,0,0.25)',
                    }}
                />
            )}
        </motion.div>
    );
}

export default function PackOpenModal({
    cards,
    isOpen,
    onClose,
    title = '¡Cartas Obtenidas!',
    subtitle,
    onRevealCard,
    onRevealAll,
    isRevealingAll = false,
}: PackOpenModalProps) {
    const allRevealed = cards.length > 0 && cards.every(c => c.revealed);

    // Auto-revelar no-Platinum al abrir
    // Las PLATINUM y MYTHIC se revelan manualmente para el drama
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex flex-col bg-black/97 backdrop-blur-2xl overflow-hidden"
                >
                    {/* Partículas de fondo */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {Array.from({ length: 25 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-0.5 h-0.5 bg-white/10 rounded-full"
                                style={{
                                    left: `${(i * 13.7) % 100}%`,
                                    top: `${(i * 17.3) % 100}%`,
                                }}
                            />
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                        {/* Header */}
                        <div className="shrink-0 text-center pt-6 pb-3 px-4">
                            <motion.h2
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-2xl font-black text-white tracking-tighter italic uppercase"
                            >
                                🎁 {title}
                            </motion.h2>
                            {subtitle && (
                                <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">
                                    {subtitle}
                                </p>
                            )}
                            <p className="text-gray-600 text-xs mt-1">
                                {allRevealed
                                    ? `✅ ${cards.length} cartas reveladas`
                                    : `Toca cada carta · ${cards.filter(c => c.revealed).length}/${cards.length} reveladas`}
                            </p>
                        </div>

                        {/* Grid de cartas */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
                            <div className="flex flex-wrap gap-3 justify-center py-4">
                                {cards.map((item, i) => (
                                    <FlipCard
                                        key={`${item.card.id}_${i}`}
                                        item={item}
                                        index={i}
                                        onReveal={onRevealCard}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 p-5 pb-24 border-t border-white/5 flex flex-col gap-3 bg-black/90 backdrop-blur-xl sticky bottom-0 z-[600]">
                            {!allRevealed && (
                                <button
                                    onClick={onRevealAll}
                                    disabled={isRevealingAll}
                                    className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest disabled:opacity-50"
                                >
                                    <Eye className="w-4 h-4" />
                                    {isRevealingAll ? 'Revelando...' : 'Revelar Todo'}
                                </button>
                            )}
                            <motion.button
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                onClick={onClose}
                                className="w-full bg-white text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] uppercase tracking-tighter text-sm border-2 border-white/10 flex items-center justify-center gap-2"
                            >
                                {allRevealed ? 'CONTINUAR' : 'OMITIR Y CONTINUAR'}
                                <ChevronRight className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
