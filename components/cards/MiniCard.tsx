/**
 * MEJORADO: CardBack.tsx
 * 
 * Dorso de las cartas mejorado con:
 * - Diseño MusicTCG profesional
 * - Patrón de ondas de sonido
 * - Logo centrado
 * - Animación sutil
 * 
 * ¿DÓNDE VA? Reemplazar src/components/CardBack.tsx
 */

import React from 'react';
import styles from '@/styles/cards.css';

interface CardBackProps {
  size?: 'small' | 'medium' | 'large';
  isFlipping?: boolean;
}

export const CardBack: React.FC<CardBackProps> = ({
  size = 'medium',
  isFlipping = false
}) => {
  const sizeClasses = {
    small: 'w-20 h-28',
    medium: 'w-24 h-36',
    large: 'w-32 h-48',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        relative
        rounded-lg
        overflow-hidden
        ${isFlipping ? 'animate-flip' : ''}
        cursor-pointer
        transition-transform
        hover:scale-105
      `}
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Fondo con patrón de ondas */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E
              %3Cpath d='M0,50 Q25,40 50,50 T100,50' stroke='%23fbbf24' fill='none' stroke-width='2'/%3E
              %3Cpath d='M0,60 Q25,50 50,60 T100,60' stroke='%23fbbf24' fill='none' stroke-width='1.5'/%3E
              %3Cpath d='M0,40 Q25,30 50,40 T100,40' stroke='%23fbbf24' fill='none' stroke-width='1.5'/%3E
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
        {/* Nota musical grande */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          className="mb-3 opacity-80 animate-pulse"
        >
          <path d="M9 18v-13l6-3v13M9 5h0M15 5h0" />
        </svg>

        {/* Texto MUSICTCG */}
        <div className="text-center">
          <h2
            className="text-lg font-black tracking-widest text-amber-400"
            style={{
              textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
              letterSpacing: '0.15em',
            }}
          >
            MUSIC
          </h2>
          <h3
            className="text-lg font-black tracking-widest text-amber-400"
            style={{
              textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
              letterSpacing: '0.15em',
            }}
          >
            TCG
          </h3>
        </div>

        {/* Subtítulo */}
        <p className="text-xs text-amber-300/60 mt-2 font-bold">
          TOCA PARA REVELAR
        </p>
      </div>

      {/* Esquinas decorativas */}
      <div className="absolute top-2 left-2 w-6 h-6 border-2 border-amber-500/40" />
      <div className="absolute top-2 right-2 w-6 h-6 border-2 border-amber-500/40" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-2 border-amber-500/40" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-2 border-amber-500/40" />

      {/* Borde brillante */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          border: '2px solid rgba(251, 191, 36, 0.3)',
          boxShadow: 'inset 0 0 20px rgba(251, 191, 36, 0.1), 0 0 20px rgba(251, 191, 36, 0.2)',
        }}
      />

      {/* Efecto holográfico sutil */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity"
        style={{
          background: `
            linear-gradient(45deg, 
              transparent 0%, 
              rgba(251, 191, 36, 0.1) 50%, 
              transparent 100%)
          `,
          animation: 'shimmer 3s infinite',
        }}
      />
    </div>
  );
};

export default CardBack;