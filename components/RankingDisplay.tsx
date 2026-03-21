'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { TIER_CONFIG, RankTier, xpForLevel } from '@/lib/engine/rankingSystem';
import { motion } from 'framer-motion';
import { Trophy, Star, ChevronRight, Zap } from 'lucide-react';

export default function RankingDisplay() {
    const { rank, level } = usePlayerStore();
    const config = TIER_CONFIG[rank.tier];

    const rankProgress = (rank.points / 25) * 100;
    const xpNeeded = xpForLevel(level.level + 1);
    const xpProgress = (level.xp / level.xpToNextLevel) * 100;

    return (
        <div className="flex flex-col gap-6 p-4 lg:p-6 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative group">
            {/* Decorative background flare */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${config.gradient} blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-700`} />

            {/* HEADER: Rank Title & Badge */}
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300 ring-2 ring-white/10`}>
                        <span className="text-3xl drop-shadow-md">{config.emoji}</span>
                    </div>
                    <div>
                        <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 font-bold mb-0.5">Rango Actual</h2>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-black ${config.color} tracking-tight italic`}>
                                {config.label.toUpperCase()}
                            </span>
                            <span className="text-white/60 font-mono text-lg">{rank.rank}</span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                        <Trophy className={`w-4 h-4 ${config.color} opacity-80`} />
                        <span className="text-sm font-bold text-white/80">{rank.rankedWins} Victorias</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 ${rank.winStreak >= 3 ? 'text-orange-400 border-orange-500/30' : 'text-white/30'}`}>
                            {rank.winStreak > 0 ? `${rank.winStreak} Win Streak` : 'Cold Streak'}
                        </div>
                    </div>
                </div>
            </div>

            {/* RANK PROGRESS BAR */}
            <div className="space-y-2 z-10">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                    <span>Progreso de Rango</span>
                    <span className={config.color}>{rank.points} / 25 RP</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full p-0.5 border border-white/5 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${rankProgress}%` }}
                        transition={{ duration: 1.2, ease: "circOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${config.gradient} relative shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
                    >
                        {/* Animated shine */}
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-20"
                        />
                    </motion.div>
                </div>
            </div>

            {/* SEPARATOR */}
            <div className="h-px bg-white/5 w-full" />

            {/* LEVEL & XP SECTION */}
            <div className="flex items-center gap-4 z-10">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-white/90">
                    {level.level}
                </div>
                <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                        <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-cyan-400" />
                            <span>Nivel de Jugador</span>
                        </div>
                        <span className="text-cyan-400">{level.xp} / {level.xpToNextLevel} XP</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${xpProgress}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full bg-cyan-500/80 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                        />
                    </div>
                </div>
            </div>

            {/* FOOTER: CTA */}
            <div className="flex items-center justify-between pt-2 z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-black bg-white/10 flex items-center justify-center">
                            <Star className={`w-3 h-3 ${i <= (rank.rank) ? config.color : 'text-white/10'}`} />
                        </div>
                    ))}
                </div>
                <button className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-white/40 hover:text-white transition-colors">
                    Ver Recompensas <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
