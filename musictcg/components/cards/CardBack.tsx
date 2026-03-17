'use client';

import { Music } from 'lucide-react';

interface CardBackProps {
  className?: string;
}

export default function CardBack({ className = '' }: CardBackProps) {
  return (
    <div className={`relative w-64 aspect-[2.5/3.5] bg-[#0a0a0a] rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl flex items-center justify-center group ${className}`}>
      {/* Vinyl Record Pattern */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="absolute inset-0 border border-white/10 rounded-full" 
            style={{ margin: `${i * 5}%` }}
          />
        ))}
      </div>

      {/* Center Label */}
      <div className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-1 shadow-[0_0_30px_rgba(124,58,237,0.5)] group-hover:scale-110 transition-transform duration-500">
        <div className="w-full h-full rounded-full bg-black flex items-center justify-center border border-white/20">
          <div className="flex flex-col items-center">
            <Music className="text-white mb-1" size={32} />
            <span className="text-[8px] font-black text-white tracking-[0.2em] uppercase">MusicTCG</span>
          </div>
        </div>
      </div>

      {/* Corner Accents */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/20 rounded-tl-sm" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/20 rounded-tr-sm" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/20 rounded-bl-sm" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/20 rounded-br-sm" />

      {/* Holographic Shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    </div>
  );
}
