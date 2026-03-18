// components/monetization/BattlePassBanner.tsx

'use client';

import { Target, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';

export default function BattlePassBanner() {
    return (
        <Link href="/battlepass">
            <div className="group relative bg-gradient-to-r from-blue-900/60 to-cyan-800/60 border border-blue-500/30 rounded-2xl p-4 mb-4 hover:border-blue-400/60 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]">
                {/* Animated Accent */}
                <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-cyan-400/10 to-transparent"></div>

                <div className="relative flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600/30 p-2.5 rounded-xl border border-blue-400/40 group-hover:scale-110 transition-transform duration-300">
                            <Target className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-sm font-black text-white uppercase tracking-tighter group-hover:text-blue-200 transition-colors">
                                    Pase Estacional
                                </h4>
                                <div className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-gray-400 border border-white/5 flex items-center gap-1">
                                    <Lock className="w-2 h-2" />
                                    Próximamente
                                </div>
                            </div>
                            <p className="text-[10px] text-blue-200/70 font-medium uppercase tracking-widest">
                                Recompensas exclusivas y nuevos sets
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/10 p-1.5 rounded-full group-hover:bg-white/20 transition-colors">
                        <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
