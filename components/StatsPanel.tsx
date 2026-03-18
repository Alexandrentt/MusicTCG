// components/StatsPanel.tsx
import React, { useEffect, useState } from 'react';
import { PlayerStats } from '@/types/gameHistory';
import { getPlayerStats } from '@/lib/database/firebaseGameHistory';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Trophy, Skull, Activity, Target, Zap, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface StatsPanelProps {
    userId: string;
}

export function StatsPanel({ userId }: StatsPanelProps) {
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getPlayerStats(userId);
                setStats(data);
            } catch (error) {
                console.error("Error cargando stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [userId]);

    if (loading) return <div className="animate-pulse space-y-4">
        <div className="h-24 bg-white/5 rounded-2xl w-full"></div>
        <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-white/5 rounded-2xl"></div>
            <div className="h-24 bg-white/5 rounded-2xl"></div>
        </div>
    </div>;

    if (!stats) return null;

    const winRate = stats.totalMatches > 0 ? (stats.totalWins / stats.totalMatches) * 100 : 0;

    const StatItem = ({ icon: Icon, label, value, subLabel, color }: any) => (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all hover:bg-white/10">
            <div className="flex items-center gap-3 mb-2 text-white/40">
                <Icon size={16} className={color} />
                <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tighter">
                {value}
            </div>
            {subLabel && <div className="text-[10px] text-white/30 uppercase mt-1">{subLabel}</div>}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Resumen Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatItem
                    icon={Trophy}
                    label="Win Rate"
                    value={`${winRate.toFixed(1)}%`}
                    subLabel={`${stats.totalWins} Victorias / ${stats.totalMatches} Partidas`}
                    color="text-yellow-400"
                />
                <StatItem
                    icon={Activity}
                    label="Duelo a Muerte"
                    value={`${stats.vsPlayerWins} / ${stats.vsPlayerLosses}`}
                    subLabel="PVP (Victorias / Derrotas)"
                    color="text-blue-400"
                />
                <StatItem
                    icon={Skull}
                    label="VS Bot"
                    value={`${stats.vsBotWins} / ${stats.vsBotLosses}`}
                    subLabel="PVE (Victorias / Derrotas)"
                    color="text-red-400"
                />
            </div>

            {/* Récords y Promedios */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1 text-white/40">
                        <Zap size={14} className="text-orange-400" />
                        <span className="text-[10px] font-bold uppercase">Racha Actual</span>
                    </div>
                    <div className="text-xl font-bold text-white">{stats.currentWinStreak}</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1 text-white/40">
                        <Target size={14} className="text-purple-400" />
                        <span className="text-[10px] font-bold uppercase">Prom. Turnos</span>
                    </div>
                    <div className="text-xl font-bold text-white">{stats.averageTurns.toFixed(1)}</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1 text-white/40">
                        <Clock size={14} className="text-cyan-400" />
                        <span className="text-[10px] font-bold uppercase">Mejor Racha</span>
                    </div>
                    <div className="text-xl font-bold text-white">{stats.longestWinStreak}</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1 text-white/40">
                        <Activity size={14} className="text-green-400" />
                        <span className="text-[10px] font-bold uppercase">Prom. Daño</span>
                    </div>
                    <div className="text-xl font-bold text-white">{stats.averageDamageDealt.toFixed(1)}</div>
                </div>
            </div>
        </div>
    );
}
