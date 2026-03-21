'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Music, Play, Sparkles, Map, Headphones, Zap } from 'lucide-react';

interface WelcomeScreenProps {
    onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-12 max-w-2xl mx-auto relative cursor-default">
            {/* Musical Pulse Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 bg-cyan-500/10 blur-[150px] w-full aspect-square rounded-full animate-pulse" />

            {/* Floating Icons Ambience */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="absolute inset-x-0 top-0 h-40 pointer-events-none"
            >
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute left-[10%] top-[40%] text-cyan-500"><Music className="w-8 h-8 opacity-40 rotate-12" /></motion.div>
                <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} className="absolute right-[15%] top-[20%] text-pink-500"><Sparkles className="w-10 h-10 opacity-30 -rotate-6" /></motion.div>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} className="absolute left-[50%] top-[10%] text-indigo-500 "><Headphones className="w-6 h-6 opacity-40 rotate-[45deg]" /></motion.div>
            </motion.div>

            {/* Logo & Intro */}
            <div className="space-y-4">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-6 backdrop-blur-3xl"
                >
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-black text-white/50 tracking-widest uppercase">Estás Entrando a la Arena</span>
                </motion.div>

                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter italic leading-[0.85] select-none"
                >
                    MUSICA<br />es <span className="text-cyan-500 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">PODER</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm md:text-lg text-white/40 tracking-widest uppercase font-medium mt-10 max-w-lg mx-auto leading-relaxed"
                >
                    Cada canción que amas se convierte en una carta de batalla. <br />
                    <span className="text-white mt-1 block">Tú controlas el escenario.</span>
                </motion.p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-xl">
                {[
                    { icon: Map, title: "Misión Tutorial", description: "Primeras 40 cartas" },
                    { icon: Zap, title: "Lucha Libre", description: "Usa tu mazo" },
                    { icon: Sparkles, title: "Descubre+", description: "Crea cartas únicas" }
                ].map((item, idx) => (
                    <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (idx * 0.1) }}
                        className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all flex flex-col items-center gap-2 group"
                    >
                        <item.icon className="w-6 h-6 text-white/30 group-hover:text-cyan-400 group-hover:scale-110 transition-all" />
                        <div className="space-y-0.5">
                            <h4 className="text-[10px] font-black text-white uppercase">{item.title}</h4>
                            <p className="text-[9px] text-white/40 tracking-tight">{item.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Primary Action */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="relative pt-10"
            >
                <button
                    onClick={onComplete}
                    className="group relative px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] transform transition-all duration-500 hover:scale-110 hover:-rotate-2 hover:bg-cyan-500 hover:text-white"
                >
                    <div className="absolute inset-0 bg-cyan-400 group-hover:blur-[20px] opacity-0 group-hover:opacity-40 transition-all" />
                    <div className="flex items-center gap-3 relative z-10">
                        <Play className="w-5 h-5 fill-current" />
                        Empezar Aventura
                    </div>
                </button>

                <p className="text-[10px] font-black text-white/20 mt-6 tracking-widest uppercase italic">
                    Sesión Invitada Iniciada (Progreso Local Guardado)
                </p>
            </motion.div>
        </div>
    );
}
