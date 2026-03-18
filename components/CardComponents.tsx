'use client';

import React, { useState, useEffect } from 'react';
import { MasterCardTemplate, rarityToColor, rarityToLabel } from '@/lib/cardGenerator';
import styles from '@/styles/cards.module.css';

// ============================================
// DORSO DE CARTA (Card Back)
// ============================================

export const CardBack: React.FC<{
  isFlipping?: boolean;
  size?: 'small' | 'medium' | 'large';
}> = ({ isFlipping = false, size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-32 h-44',
    medium: 'w-40 h-56',
    large: 'w-48 h-64',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        relative bg-gradient-to-br from-slate-900 via-slate-800 to-black
        rounded-lg border-2 border-amber-500/30
        flex items-center justify-center
        cursor-pointer transition-transform duration-500
        ${isFlipping ? 'animate-flip-card' : 'hover:shadow-lg hover:shadow-amber-500/20'}
        overflow-hidden
      `}
      style={{
        perspective: '1000px',
      }}
    >
      {/* Patrón de fondo minimalista */}
      <div className="absolute inset-0 opacity-30">
        <svg
          className="w-full h-full"
          viewBox="0 0 200 280"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ondas de sonido estilizadas */}
          <defs>
            <pattern
              id="soundWaves"
              x="0"
              y="0"
              width="40"
              height="280"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20,80 Q 20,120 20,160"
                stroke="rgba(251,146,60,0.3)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M 20,100 Q 25,130 20,160"
                stroke="rgba(251,146,60,0.2)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 20,120 Q 15,140 20,160"
                stroke="rgba(251,146,60,0.15)"
                strokeWidth="1"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="200" height="280" fill="url(#soundWaves)" />

          {/* Línea central (símbolo musical) */}
          <circle cx="100" cy="100" r="8" fill="rgba(251,146,60,0.4)" />
          <circle cx="100" cy="140" r="6" fill="rgba(251,146,60,0.3)" />
          <circle cx="100" cy="170" r="4" fill="rgba(251,146,60,0.2)" />
        </svg>
      </div>

      {/* Logo del juego (MusicTCG) */}
      <div className="relative z-10 text-center">
        <div className="text-amber-500 font-bold text-lg tracking-widest mb-2">
          MUSICTCG
        </div>
        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
          {/* Símbolo de nota musical */}
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 3v9.28c-.47-.46-1.12-.72-1.84-.72-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5 4.5-2.02 4.5-4.5V7h4V3h-6z" />
          </svg>
        </div>
        <div className="text-amber-600/60 text-xs tracking-widest">
          • DISCOVER •
        </div>
      </div>

      {/* Detalles decorativos en esquinas */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-amber-500/40" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-amber-500/40" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-amber-500/40" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-amber-500/40" />

      {/* Brillo de borde animado */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 20px rgba(251,146,60,0.1)',
        }}
      />
    </div>
  );
};

// ============================================
// CARA DE CARTA (Card Front)
// ============================================

export const CardFront: React.FC<{
  card: MasterCardTemplate;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}> = ({ card, size = 'medium', showDetails = true }) => {
  const sizeClasses = {
    small: 'w-32 h-44',
    medium: 'w-40 h-56',
    large: 'w-48 h-64',
  };

  const textSizes = {
    small: { title: 'text-xs', stats: 'text-xs' },
    medium: { title: 'text-sm', stats: 'text-sm' },
    large: { title: 'text-base', stats: 'text-base' },
  };

  const rarityColor = rarityToColor(card.rarity);

  return (
    <div
      className={`
        ${sizeClasses[size]}
        relative rounded-lg overflow-hidden
        border-2 transition-all duration-300
        flex flex-col
      `}
      style={{
        borderColor: rarityColor,
        backgroundColor: '#1a1a1a',
      }}
    >
      {/* Fondo: Portada del álbum */}
      {card.artworkUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${card.artworkUrl})`,
            filter: 'brightness(0.6)',
          }}
        />
      )}

      {/* Overlay para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />

      {/* Contenido */}
      <div className="relative z-10 p-2 flex flex-col h-full">
        {/* Número de pista (GDD: Diferenciación Procedural) */}
        <div className="text-right text-amber-500/40 text-xs font-bold tracking-widest opacity-50">
          PISTA {card.trackNumber}
        </div>

        {/* Información de la canción (centro) */}
        <div className="flex-1 flex flex-col justify-center">
          <h3
            className={`font-bold text-white truncate ${textSizes[size].title}`}
            title={card.name}
          >
            {card.name}
          </h3>
          <p
            className={`text-gray-300 truncate text-xs ${textSizes[size].stats}`}
            title={card.artist}
          >
            {card.artist}
          </p>
        </div>

        {/* Estadísticas (inferior) */}
        <div className="flex items-end justify-between gap-2 text-white font-bold">
          {/* Coste de Energía (esquina superior derecha) */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: rarityColor,
              color: '#000',
            }}
          >
            {card.cost}
          </div>

          <div className="flex gap-2">
            {/* Ataque */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-red-400 font-bold">⚔</span>
              <span className={textSizes[size].stats}>{card.atk}</span>
            </div>

            {/* Defensa */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-blue-400 font-bold">🛡</span>
              <span className={textSizes[size].stats}>{card.def}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de rareza (bottom) */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center text-xs font-bold uppercase tracking-widest"
        style={{
          backgroundColor: rarityColor,
          color: '#000',
        }}
      >
        {rarityToLabel(card.rarity)}
      </div>

      {/* Glow de rareza */}
      <div
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{
          boxShadow: `inset 0 0 20px ${rarityColor}20, 0 0 20px ${rarityColor}30`,
        }}
      />
    </div>
  );
};

// ============================================
// CONTENEDOR FLIP (Frontal + Dorso)
// ============================================

export const CardFlip: React.FC<{
  card: MasterCardTemplate;
  size?: 'small' | 'medium' | 'large';
  onFlip?: (isFlipped: boolean) => void;
  defaultFlipped?: boolean;
}> = ({ card, size = 'medium', onFlip, defaultFlipped = false }) => {
  const [isFlipped, setIsFlipped] = useState(defaultFlipped);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
    onFlip?.(!isFlipped);
  };

  return (
    <div
      className="perspective cursor-pointer"
      onClick={handleClick}
      style={{
        perspective: '1000px',
      }}
    >
      <div
        className="relative transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          <CardFront card={card} size={size} />
        </div>

        {/* Back */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <CardBack size={size} isFlipping={isFlipped} />
        </div>
      </div>
    </div>
  );
};

// ============================================
// GRID DE SOBRES (Booster Pack Display)
// ============================================


interface BoosterPackGridProps {
  boosterPacks: Array<{
    id: string;
    rarity: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    cards: MasterCardTemplate[];
    isOpening?: boolean;
  }>;
  onPackOpen?: (packId: string) => void;
}

export const BoosterPackGrid: React.FC<BoosterPackGridProps> = ({
  boosterPacks,
  onPackOpen,
}) => {
  const getRarityColor = (rarity: string) => {
    const colors: { [key: string]: string } = {
      BRONZE: 'from-amber-700 to-amber-900',
      SILVER: 'from-slate-400 to-slate-600',
      GOLD: 'from-yellow-400 to-yellow-600',
      PLATINUM: 'from-violet-300 to-violet-600',
    };
    return colors[rarity] || colors.BRONZE;
  };

  const getGlowColor = (rarity: string) => {
    const glows: { [key: string]: string } = {
      BRONZE: 'shadow-amber-500/50',
      SILVER: 'shadow-slate-400/50',
      GOLD: 'shadow-yellow-400/50',
      PLATINUM: 'shadow-violet-400/50',
    };
    return glows[rarity] || glows.BRONZE;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Título */}
      <div className="px-4 py-4 border-b border-amber-500/20">
        <h2 className="text-2xl font-bold text-amber-400">
          {boosterPacks.length} Sobres
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Desplázate para ver más • Haz clic para abrir
        </p>
      </div>

      {/* Grid con SCROLL LIMITADO */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-h-[70vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {boosterPacks.map((pack) => (
            <div
              key={pack.id}
              onClick={() => onPackOpen?.(pack.id)}
              className={`
                relative
                cursor-pointer
                transform
                transition-all
                duration-300
                hover:scale-105
                hover:-translate-y-2
                ${getGlowColor(pack.rarity)}
                shadow-lg
              `}
            >
              {/* Sobre */}
              <div
                className={`
                  bg-gradient-to-br
                  ${getRarityColor(pack.rarity)}
                  rounded-xl
                  p-6
                  min-h-[300px]
                  flex
                  flex-col
                  items-center
                  justify-center
                  relative
                  overflow-hidden
                  border
                  border-amber-500/20
                `}
              >
                {/* Efecto de brillo */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)
                    `,
                  }}
                />

                {/* Contenido */}
                <div className="relative z-10 text-center">
                  {/* Icono de sobre */}
                  <svg
                    className="w-20 h-20 mx-auto mb-4 text-white opacity-80"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>

                  {/* Rareza */}
                  <div className="mb-3">
                    <span
                      className={`
                        inline-block
                        px-4
                        py-2
                        rounded-full
                        font-bold
                        text-sm
                        ${pack.rarity === 'BRONZE'
                          ? 'bg-amber-800 text-amber-100'
                          : pack.rarity === 'SILVER'
                            ? 'bg-slate-500 text-white'
                            : pack.rarity === 'GOLD'
                              ? 'bg-yellow-500 text-yellow-900'
                              : 'bg-violet-500 text-white'
                        }
                      `}
                    >
                      {pack.rarity}
                    </span>
                  </div>

                  {/* Texto */}
                  <h3 className="text-white font-bold text-lg mb-2">Sobre Booster</h3>
                  <p className="text-white/70 text-sm">
                    {pack.cards.length} cartas • Haz clic para revelar
                  </p>

                  {/* Animación de espera si está abriendo */}
                  {pack.isOpening && (
                    <div className="mt-4 flex justify-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200" />
                    </div>
                  )}
                </div>

                {/* Partículas de rareza */}
                {pack.rarity === 'PLATINUM' && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-float"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Espacio para el botón - SIEMPRE VISIBLE */}
      <div className="px-4 py-4 border-t border-amber-500/20 bg-black/50 backdrop-blur">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-3">
            Abre todos los sobres antes de continuar
          </p>
          <button
            className={`
              w-full
              py-3
              px-6
              rounded-lg
              font-bold
              text-lg
              transition-all
              transform
              ${boosterPacks.length === 0
                ? 'bg-green-500 hover:bg-green-600 text-white hover:scale-105'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
            disabled={boosterPacks.length > 0}
          >
            {boosterPacks.length === 0 ? '✓ Continuar' : '⏳ Abre los sobres...'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoosterPackGrid;
// ============================================
// TARJETA DE BOOSTER INDIVIDUAL
// ============================================

export const BoosterPackCard: React.FC<{
  pack: {
    id: string;
    cards: MasterCardTemplate[];
    isOpening?: boolean;
    isOpen?: boolean;
  };
  onClick?: () => void;
}> = ({ pack, onClick }) => {
  const [particleCount, setParticleCount] = useState(0);

  useEffect(() => {
    if (pack.isOpening) {
      // Generar partículas SIN cambiar el tamaño del contenedor
      setParticleCount(15);
      const timer = setTimeout(() => setParticleCount(0), 1500);
      return () => clearTimeout(timer);
    }
  }, [pack.isOpening]);

  // Rareza más alta en el sobre
  const highestRarity = pack.cards.reduce(
    (highest, card) => {
      const rarityOrder = { PLATINUM: 4, GOLD: 3, SILVER: 2, BRONZE: 1 };
      return rarityOrder[card.rarity] > rarityOrder[highest.rarity]
        ? card
        : highest;
    },
    pack.cards[0]
  );

  const borderColor = rarityToColor(highestRarity.rarity);

  return (
    <div
      className="flex justify-center items-center min-h-80"
      onClick={onClick}
    >
      <div
        className={`
          w-40 h-56 relative cursor-pointer
          rounded-lg border-4 transition-all duration-300
          flex flex-col items-center justify-center
          ${pack.isOpen ? 'opacity-50' : 'hover:shadow-2xl'}
        `}
        style={{
          borderColor,
          backgroundColor: 'rgba(0,0,0,0.5)',
          boxShadow: pack.isOpening
            ? `0 0 40px ${borderColor}, inset 0 0 30px ${borderColor}40`
            : `0 0 20px ${borderColor}40`,
        }}
      >
        {/* Partículas POSICIONADAS ABSOLUTAMENTE (no afectan layout) */}
        {Array.from({ length: particleCount }).map((_, i) => (
          <Particle key={i} color={borderColor} />
        ))}

        {/* Contenido */}
        {!pack.isOpen ? (
          <>
            {/* Ícono de sobre */}
            <svg
              className="w-16 h-16 mb-4"
              fill={borderColor}
              viewBox="0 0 24 24"
            >
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>

            {/* Rareza */}
            <div
              className="text-sm font-bold uppercase tracking-widest text-center px-3 py-1 rounded"
              style={{
                backgroundColor: borderColor + '40',
                color: borderColor,
              }}
            >
              {rarityToLabel(highestRarity.rarity)}
            </div>

            {/* Instrucción */}
            <p className="text-gray-400 text-xs mt-4 text-center px-2">
              Haz clic para abrir
            </p>
          </>
        ) : (
          <>
            {/* Mostrar preview de cartas cuando está abierto */}
            <div className="text-center">
              <p className="text-amber-500 text-sm font-bold">Abierto</p>
              <p className="text-gray-400 text-xs mt-2">
                {pack.cards.length} cartas
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE DE PARTÍCULAS (Static Position)
// ============================================

const Particle: React.FC<{ color: string }> = ({ color }) => {
  const style = {
    position: 'absolute' as const,
    width: `${Math.random() * 4 + 2}px`,
    height: `${Math.random() * 4 + 2}px`,
    backgroundColor: color,
    borderRadius: '50%',
    pointerEvents: 'none' as const,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animation: `particle-float ${Math.random() * 1 + 0.5}s ease-out forwards`,
    opacity: Math.random() * 0.8 + 0.2,
  };

  return <div style={style} />;
};

export default CardBack;
