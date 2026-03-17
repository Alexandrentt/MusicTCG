'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Sparkles, Layers, Trophy } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function StatsBar() {
  const { regalias, inventory, language } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  
  const totalCards = Object.values(inventory).reduce((acc, item) => acc + item.count, 0);
  const uniqueCards = Object.keys(inventory).length;

  if (!mounted) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-md border-b border-white/5 px-4 py-2 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        {/* Regalias */}
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-sm font-bold text-white">{regalias.toLocaleString()}</span>
        </div>

        {/* Total Cards */}
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-sm font-bold text-white">{totalCards}</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">Total</span>
        </div>

        {/* Unique Cards */}
        <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <Trophy className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-sm font-bold text-white">{uniqueCards}</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">Unique</span>
        </div>
      </div>
    </div>
  );
}
