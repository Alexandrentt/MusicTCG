// components/MatchHistory.tsx
import React, { useEffect, useState } from 'react';
import { GameMatch } from '@/types/gameHistory';
import { getPlayerMatchHistory } from '@/lib/database/supabaseGameHistory';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Trophy, Skull, Activity, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

interface MatchHistoryProps {
    userId: string;
}

export function MatchHistory({ userId }: MatchHistoryProps) {
    const [matches, setMatches] = useState<GameMatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getPlayerMatchHistory(userId, 10);
                setMatches(history);
            } catch (error) {
                console.error("Error cargando historial:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [userId]);

    if (loading) return <div className="text-white/50 animate-pulse text-center p-8">Cargando Historial...</div>;
    if (matches.length === 0) return <div className="text-white/30 text-center p-8 border border-white/10 rounded-xl bg-white/5">Sin partidas registradas aún</div>;

    return (
        <div className="space-y-4">
            {matches.map((match) => {
                const isWinner = match.winnerId === userId;
                const opponent = match.playerA.userId === userId ? match.playerB : match.playerA;

                return (
                    <div key={match.matchId} className={clsx(
                        "p-4 rounded-xl border flex items-center justify-between transition-all hover:scale-[1.02]",
                        isWinner ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                    )}>
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                isWinner ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            )}>
                                {isWinner ? <Trophy size={24} /> : <Skull size={24} />}
                            </div>

                            <div>
                                <h4 className="text-white font-medium flex items-center gap-2">
                                    vs {opponent.username}
                                    <span className="text-xs text-white/40 font-normal px-2 py-0.5 bg-white/5 rounded-full border border-white/10">
                                        {match.mode}
                                    </span>
                                </h4>
                                <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                                    <Calendar size={12} />
                                    {new Date(match.finishedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-xs text-white/40 flex items-center gap-3 justify-end">
                                <span className="flex items-center gap-1"><Activity size={10} /> {match.stats.turns} Turnos</span>
                                <span>{match.stats.winCondition}</span>
                            </div>
                            <p className={clsx(
                                "text-lg font-bold tracking-tighter mt-1",
                                isWinner ? "text-green-400" : "text-red-400"
                            )}>
                                {isWinner ? "VICTORIA" : "DERROTA"}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
