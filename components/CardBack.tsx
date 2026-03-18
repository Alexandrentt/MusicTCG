/**
 * MEJORADO: CardBack.tsx
 * 
 * Dorso de las cartas mejorado con:
 * - Diseño MusicTCG profesional
 * - Patrón de ondas de sonido
 * - Logo centrado
 * - Soporte para cartas raras (brillo especial)
 */

import React from 'react';
import { motion } from 'motion/react';

interface CardBackProps {
  size?: 'small' | 'medium' | 'large' | 'full';
  isFlipping?: boolean;
  className?: string;
  isRare?: boolean;
}

export const CardBack: React.FC<CardBackProps> = ({
  size = 'medium',
  isFlipping = false,
  className = '',
  isRare = false
}) => {
  const sizeClasses = {
    small: 'w-20 h-28',
    medium: 'w-24 h-36',
    large: 'w-32 h-48',
    full: 'w-full h-full',
  };

  return (
    <div
      className={`
      ${sizeClasses[size]}
      relative
      rounded-lg
      overflow-hidden
      ${isFlipping ? 'animate-flip' : ''}
      transition-all
      ${className}
      ${isRare ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]' : ''}
      `}
      style={{
        background: isRare
          ? 'linear-gradient(135deg, #1a1a2e 0%, #2a1b3d 50%, #44318d 100%)'
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Fondo con patrón de ondas */}
      <div
        className={`absolute inset-0 ${isRare ? 'opacity-40' : 'opacity-20'}`}
        style={{
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E
              %3Cpath d='M0,50 Q25,40 50,50 T100,50' stroke='${isRare ? '%23fbbf24' : '%234f46e5'}' fill='none' stroke-width='2'/%3E
              %3Cpath d='M0,60 Q25,50 50,60 T100,60' stroke='${isRare ? '%23fbbf24' : '%234f46e5'}' fill='none' stroke-width='1.5'/%3E
            %3C/svg%3E")
          `,
          backgroundRepeat: 'repeat',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Brillo superior */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent" />

      {/* Logo principal - MUSICTCG */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isRare ? "#fbbf24" : "#4f46e5"}
          strokeWidth="2"
          className={`mb-3 ${isRare ? 'animate-pulse' : 'opacity-80'}`}
        >
          <path d="M9 18v-13l6-3v13M9 5h0M15 5h0" />
        </svg>

        <div className="text-center">
          <h2
            className={`text-lg font-black tracking-widest ${isRare ? 'text-amber-400' : 'text-blue-400'}`}
            style={{
              textShadow: isRare ? '0 0 10px rgba(251, 191, 36, 0.5)' : 'none',
              letterSpacing: '0.15em',
            }}
          >
            MUSIC
          </h2>
          <h3
            className={`text-lg font-black tracking-widest ${isRare ? 'text-amber-400' : 'text-blue-400'}`}
            style={{
              textShadow: isRare ? '0 0 10px rgba(251, 191, 36, 0.5)' : 'none',
              letterSpacing: '0.15em',
            }}
          >
            TCG
          </h3>
        </div>
      </div>

      {/* Esquinas decorativas */}
      <div className={`absolute top-2 left-2 w-6 h-6 border-2 ${isRare ? 'border-amber-500/40' : 'border-blue-500/20'}`} />
      <div className={`absolute top-2 right-2 w-6 h-6 border-2 ${isRare ? 'border-amber-500/40' : 'border-blue-500/20'}`} />
      <div className={`absolute bottom-2 left-2 w-6 h-6 border-2 ${isRare ? 'border-amber-500/40' : 'border-blue-500/20'}`} />
      <div className={`absolute bottom-2 right-2 w-6 h-6 border-2 ${isRare ? 'border-amber-500/40' : 'border-blue-500/20'}`} />

      {/* Brillo holográfico para raras */}
      {isRare && (
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '200% 200%'],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent)',
            backgroundSize: '200% 200%',
          }}
        />
      )}
    </div>
  );
};

export default CardBack;