// components/battle/PlaylistStack.tsx

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlaylistStack, PlaylistCard as PlaylistCardType } from '@/types/playlist';
import PlaylistCard from './PlaylistCard';
import { ChevronDown, Zap, Shield, Music } from 'lucide-react';

interface PlaylistStackProps {
    stack: PlaylistStack;
    isExpanded: boolean;
    onToggleExpand: () => void;
    isPlayerTurn: boolean;
    onCardSelect?: (cardId: string, stackId: string) => void;
}

export default function PlaylistStackComponent({
    stack,
    isExpanded,
    onToggleExpand,
    isPlayerTurn,
    onCardSelect,
}: PlaylistStackProps) {
    const leaderCard = stack.cards[0];

    if (!leaderCard) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative group h-full"
        >
            {/* Bonus indicator */}
            {stack.bonusActive && (
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center z-20 shadow-lg shadow-emerald-500/20"
                >
                    <span className="text-[10px] font-black text-white">+S</span>
                </motion.div>
            )}

            {/* Stack Container */}
            <motion.button
                onClick={onToggleExpand}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative w-full rounded-xl overflow-hidden border-2 transition-all p-1 h-full ${isExpanded
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10'
                    }`}
            >
                {/* Card visual stack effect */}
                <div className="relative aspect-[2/3] w-full">
                    {/* Visual layering */}
                    {stack.totalCount > 1 && (
                        <>
                            <div className="absolute top-1 right-1 w-full h-full rounded-lg bg-white/5 border border-white/10 -z-10 translate-x-1 translate-y-1" />
                            <div className="absolute top-2 right-2 w-full h-full rounded-lg bg-white/5 border border-white/10 -z-20 translate-x-2 translate-y-2" />
                        </>
                    )}

                    <div
                        className="w-full h-full bg-cover bg-center rounded-lg relative overflow-hidden"
                        style={{
                            backgroundImage: `url(${leaderCard.cardData.artworkUrl})`,
                        }}
                    >
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

                        {/* Stack info */}
                        <div className="absolute inset-0 p-3 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <span className="text-xs font-bold text-white">{leaderCard.cardData.cost}</span>
                                </div>
                                {stack.totalCount > 1 && (
                                    <div className="px-2 py-0.5 rounded-full bg-cyan-600 border border-cyan-400 text-[10px] font-black text-white">
                                        {stack.totalCount} CARDS
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                {/* Mini Stats */}
                                <div className="flex justify-between items-center text-white">
                                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
                                        <Zap className="w-3 h-3 text-cyan-400" />
                                        <span className="text-xs font-bold">{leaderCard.cardData.atk + stack.bonus.atkBonus}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
                                        <Shield className="w-3 h-3 text-emerald-400" />
                                        <span className="text-xs font-bold">{leaderCard.currentDef + stack.bonus.defBonus}</span>
                                    </div>
                                </div>

                                {/* Album info */}
                                <div className="text-left bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                                    <p className="text-[10px] font-extrabold text-white truncate uppercase tracking-tighter uppercase">{stack.albumName}</p>
                                    <p className="text-[9px] text-white/60 truncate">{stack.genre}</p>
                                </div>
                            </div>
                        </div>

                        {/* State indicator (Tapped/Untapped) */}
                        {leaderCard.state === 'TAPPED' && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                <div className="bg-white/20 px-3 py-1 rounded-full border border-white/40">
                                    <span className="text-white font-black text-[10px] uppercase">Agotada</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expand indicator button */}
                {stack.totalCount > 1 && (
                    <div className="py-1 flex justify-center">
                        <ChevronDown className={`w-4 h-4 text-cyan-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                )}
            </motion.button>

            {/* Expanded view (Accordion) */}
            <AnimatePresence>
                {isExpanded && stack.totalCount > 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-[80%] left-0 right-0 mt-2 bg-black/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 z-[100] shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Music className="w-4 h-4 text-cyan-500" />
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Stack Completo</h4>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {stack.cards.map((card, idx) => (
                                <PlaylistCard
                                    key={card.id}
                                    card={card}
                                    onClick={() => onCardSelect?.(card.id, stack.stackId)}
                                    compact
                                    atkBonus={stack.bonus.atkBonus}
                                    defBonus={stack.bonus.defBonus}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
