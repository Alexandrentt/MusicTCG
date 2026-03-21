// src/components/onboarding/BattleTutorial.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Zap, Layers, RefreshCw, X, Shield, Sparkles, AlertCircle } from 'lucide-react';
import PlaylistView from '@/components/battle/PlaylistView';
import SabotageIndicator from '@/components/battle/SabotageIndicator';
import ComboDetector from '@/components/battle/ComboDetector';
import DeckPreviewWindow from '@/components/battle/DeckPreviewWindow';
import { getSharedPlaylist } from '@/lib/engine/sharedPlaylistService';
import { CardData } from '@/lib/engine/generator';

interface BattleTutorialProps {
    onComplete: () => void;
}

const STEPS = [
    {
        id: 'intro',
        title: 'EL CAMPO DE BATALLA',
        description: 'Bienvenido al escenario. Aquí es donde la música se convierte en poder. En el centro verás tu energía y la playlist global.',
        highlight: 'energy'
    },
    {
        id: 'energy',
        title: 'ENERGÍA Y SACRIFICIO',
        description: 'Empiezas con 1 de energía. Una vez por turno, puedes sacrificar una carta de tu mano para aumentar tu capacidad máxima permanentemente.',
        highlight: 'energy'
    },
    {
        id: 'playlist',
        title: 'PLAYLIST COMPARTIDA',
        description: 'Ambos jugadores escuchan la misma música. Si juegas una carta que coincida con el GÉNERO actual, recibirás bonos masivos de ATK, DEF o HYPE.',
        highlight: 'playlist'
    },
    {
        id: 'sabotage',
        title: 'EL ARTE DEL SABOTAJE',
        description: 'Puedes sabotear el robo del rival. Desde encriptar su visión hasta obligarle a robar desde el fondo del mazo (REVERSE DRAW).',
        highlight: 'sabotage'
    },
    {
        id: 'combos',
        title: 'SINERGIA DE ÁLBUM',
        description: 'Las cartas del mismo álbum se agrupan en STACKS. Un stack completo genera combos automáticos que verás en tu detector de sinergias.',
        highlight: 'combos'
    }
];

export default function BattleTutorial({ onComplete }: BattleTutorialProps) {
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [sharedPlaylist, setSharedPlaylist] = useState(getSharedPlaylist());
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const step = STEPS[currentStepIdx];

    const handleNext = () => {
        if (currentStepIdx < STEPS.length - 1) {
            setCurrentStepIdx(currentStepIdx + 1);
        } else {
            onComplete();
        }
    };

    // Datos mock para el tutorial
    const mockHand: CardData[] = [
        { id: 'c1', name: 'Synth Pulse', artist: 'Cyber', genre: 'Electronic', rarity: 'GOLD', type: 'CREATURE', atk: 5, def: 5, stats: { atk: 5, def: 5 }, cost: 2, album: 'Neon City', artworkUrl: '', abilities: [], keywords: [], themeColor: '#00ffff' },
        { id: 'c2', name: 'Bass Drop', artist: 'Sub', genre: 'Electronic', rarity: 'PLATINUM', type: 'EVENT', atk: 0, def: 0, stats: { atk: 0, def: 0 }, cost: 3, album: 'Neon City', artworkUrl: '', abilities: [], keywords: [], themeColor: '#ff00ff' },
    ];

    return (
        <div className="min-h-screen bg-black/95 flex flex-col pt-20 relative overflow-hidden">
            {/* ══════════════════════════════════════════ */}
            {/* HUD DE TUTORIAL (El guía) */}
            {/* ══════════════════════════════════════════ */}
            <motion.div
                key={step.id}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-full max-w-xl"
            >
                <div className="bg-zinc-900/90 backdrop-blur-3xl border border-cyan-500/30 p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(34,211,238,0.2)] relative">
                    <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-black text-white border-4 border-black">
                        {currentStepIdx + 1}
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase">Lección Tutorial</h4>
                            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{step.title}</h3>
                            <p className="text-sm text-white/50 leading-relaxed font-medium">{step.description}</p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleNext}
                            className="px-8 py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-cyan-500 hover:text-white transition-all transform hover:scale-105"
                        >
                            {currentStepIdx === STEPS.length - 1 ? '¡LO TENGO!' : 'ENTENDIDO'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ══════════════════════════════════════════ */}
            {/* VISTA COMBATE (Previsualización) */}
            {/* ══════════════════════════════════════════ */}
            <div className={`transition-all duration-700 ${step.highlight === 'playlist' ? 'scale-105' : 'opacity-40 grayscale'}`}>
                <div className="flex justify-center mb-10">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
                        <div className="flex items-center gap-8 px-6">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">GENERO ACTUAL</span>
                                <span className="text-2xl font-black text-cyan-400 italic tracking-tighter uppercase">{sharedPlaylist.currentTrack?.genre}</span>
                            </div>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">BONO ACTIVO</span>
                                <span className="text-2xl font-black text-white italic tracking-tighter uppercase">+{sharedPlaylist.currentTrack?.bonusValue} {sharedPlaylist.currentTrack?.bonusType}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`transition-all duration-700 h-[60vh] overflow-hidden ${step.highlight === 'energy' ? 'scale-110 opacity-100' : 'opacity-20 translate-y-20'}`}>
                <PlaylistView
                    playerPlaylist={[]}
                    rivalPlaylist={[]}
                    playerEnergy={{ current: 1, max: 1 }}
                    isPlayerTurn={true}
                    sacrificeUsed={0}
                />
            </div>

            {/* Extras flotantes */}
            <div className="fixed bottom-10 left-10 flex flex-col gap-4 z-50">
                <div className={`transition-all duration-700 ${step.highlight === 'sabotage' ? 'translate-x-0' : '-translate-x-[200%]'}`}>
                    <SabotageIndicator activeSabotages={['ENCRYPT', 'REVERSE_DRAW']} targetName="RIVAL" />
                </div>
            </div>

            <div className="fixed bottom-10 right-10 z-50">
                <div className={`transition-all duration-700 ${step.highlight === 'combos' ? 'translate-x-0 opacity-100' : 'translate-x-[200%] opacity-0'}`}>
                    <ComboDetector playerHand={mockHand} playerBoard={[]} />
                </div>
            </div>

            {/* Control Visual del Mazo */}
            <div className="fixed top-1/2 right-10 -translate-y-1/2 z-50">
                <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="p-6 bg-white/5 border border-white/10 rounded-full hover:bg-cyan-500 transition-all group"
                >
                    <Layers className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black text-[10px] font-black text-white p-2 rounded px-4 whitespace-nowrap transition-opacity">
                        VER PRÓXIMAS PISTAS
                    </div>
                </button>
            </div>

            <DeckPreviewWindow
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                cards={mockHand}
                isEncrypted={step.id === 'sabotage'}
            />
        </div>
    );
}
