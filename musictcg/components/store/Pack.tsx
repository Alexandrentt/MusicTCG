'use client';

import { motion } from 'motion/react';
import { Music, Star, Sparkles } from 'lucide-react';

interface PackProps {
  type: 'BASIC' | 'LEGENDS' | 'POP' | 'ROCK' | 'ELECTRONIC' | 'FREE';
  onClick?: () => void;
  className?: string;
}

export default function Pack({ type, onClick, className = '' }: PackProps) {
  const getPackColors = () => {
    switch (type) {
      case 'LEGENDS':
        return 'from-amber-400 via-yellow-600 to-amber-900';
      case 'POP':
        return 'from-pink-400 via-purple-500 to-indigo-600';
      case 'ROCK':
        return 'from-red-600 via-zinc-800 to-black';
      case 'ELECTRONIC':
        return 'from-cyan-400 via-blue-500 to-purple-600';
      case 'FREE':
        return 'from-emerald-400 via-teal-500 to-green-600';
      default:
        return 'from-slate-400 via-slate-600 to-slate-800';
    }
  };

  const getPackIcon = () => {
    switch (type) {
      case 'LEGENDS':
        return <Star className="text-amber-200" size={48} />;
      case 'POP':
        return <Sparkles className="text-pink-200" size={48} />;
      case 'ROCK':
        return <Music className="text-red-400" size={48} />;
      case 'ELECTRONIC':
        return <Sparkles className="text-cyan-200" size={48} />;
      case 'FREE':
        return <Music className="text-emerald-200" size={48} />;
      default:
        return <Music className="text-slate-300" size={48} />;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative w-48 h-72 cursor-pointer perspective-1000 ${className}`}
    >
      {/* Pack Body */}
      <div className={`w-full h-full rounded-xl bg-gradient-to-br ${getPackColors()} shadow-2xl border-2 border-white/20 overflow-hidden flex flex-col items-center justify-between p-6 relative`}>
        {/* Foil Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        
        {/* Top Seal */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-black/20 flex items-center justify-center gap-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-1 h-full bg-black/10" />
          ))}
        </div>

        {/* Logo/Icon */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-black/20 backdrop-blur-sm border border-white/10">
            {getPackIcon()}
          </div>
          <h3 className="text-white font-black text-xl tracking-tighter uppercase italic drop-shadow-lg">
            {type}
          </h3>
        </div>

        {/* Bottom Seal */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/20 flex items-center justify-center gap-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-1 h-full bg-black/10" />
          ))}
        </div>

        {/* Decorative Elements */}
        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
          MusicTCG Official
        </div>
      </div>

      {/* Glow Effect */}
      <div className={`absolute -inset-4 bg-gradient-to-br ${getPackColors()} blur-2xl opacity-20 -z-10`} />
    </motion.div>
  );
}
