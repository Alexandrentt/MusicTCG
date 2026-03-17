'use client';

import { Music } from 'lucide-react';

interface CardBackProps {
  className?: string;
  isRare?: boolean;
}

export default function CardBack({ className = '', isRare = false }: CardBackProps) {
  return (
    <div className={`relative w-full h-full bg-[#050505] rounded-xl border-2 ${isRare ? 'border-[#ffd700] shadow-[0_0_40px_rgba(255,215,0,0.4)]' : 'border-zinc-800 shadow-2xl'} overflow-hidden flex items-center justify-center group ${className}`}>
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#000000_100%)]" />

      {/* Geometric Energy Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20 group-hover:opacity-40 transition-opacity duration-700" viewBox="0 0 100 140">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.1" />
          </pattern>
        </defs>
        <rect width="100" height="140" fill="url(#grid)" />
        <circle cx="50" cy="70" r="40" fill="none" stroke="currentColor" strokeWidth="0.2" className={isRare ? 'text-yellow-500' : 'text-blue-500'} />
        <circle cx="50" cy="70" r="35" fill="none" stroke="currentColor" strokeWidth="0.1" className={isRare ? 'text-yellow-600' : 'text-purple-600'} />
      </svg>

      {/* The Vinyl / Core */}
      <div className="relative z-10 w-[85%] aspect-square rounded-full flex items-center justify-center p-0.5">
        {/* Vinyl Grooves Effect */}
        <div className={`absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,_#111_0px,_#111_2px,_#222_3px,_#111_4px)] opacity-80 ${isRare ? 'shadow-[0_0_25px_rgba(255,215,0,0.2)]' : 'shadow-2xl'}`} />

        {/* Central Label */}
        <div className={`relative w-1/2 h-1/2 rounded-full flex items-center justify-center overflow-hidden border-2 ${isRare ? 'border-yellow-400 bg-gradient-to-tr from-yellow-700 via-yellow-400 to-yellow-800' : 'border-zinc-700 bg-gradient-to-br from-zinc-900 to-black'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />
          <Music className={`w-8 h-8 ${isRare ? 'text-black' : 'text-white'} drop-shadow-lg animate-pulse`} />
        </div>

        {/* Outer Glow Ring */}
        <div className={`absolute -inset-1 rounded-full border-2 border-dashed opacity-40 animate-[spin_20s_linear_infinite] ${isRare ? 'border-yellow-500' : 'border-indigo-500'}`} />
      </div>

      {/* Decorative Text */}
      <div className="absolute bottom-4 left-0 right-0 text-center flex flex-col items-center">
        <span className={`text-[9px] font-black tracking-[0.4em] uppercase ${isRare ? 'text-yellow-500' : 'text-zinc-500'}`}>
          Music TCG
        </span>
        <div className={`mt-1 h-[1px] w-12 ${isRare ? 'bg-yellow-500' : 'bg-zinc-700'}`} />
      </div>

      {/* Rare Polish */}
      {isRare && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none group-hover:animate-shine transition-all duration-1000" />
      )}

      {/* Corner Brackets */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/10" />
      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/10" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/10" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/10" />
    </div>
  );
}
