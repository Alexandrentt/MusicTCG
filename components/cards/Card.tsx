'use client';
import { CardData } from '@/lib/engine/generator';
import { Music, Play, Star, Zap, Shield, Sparkles } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { getBestArtworkSync, ArtworkVariant } from '@/lib/engine/artworkEnricher';

interface CardProps {
  data: CardData;
  className?: string;
  onDoubleClick?: () => void;
  isBig?: boolean;
  disableHover?: boolean;
  onArtistClick?: (artist: string) => void;
}

// ─────────────────────────────────────────────────────────────────────
// Habilidades por rareza (definido en combinationMatrix.ts):
//   BRONZE   → 1 habilidad
//   SILVER   → 2 habilidades
//   GOLD     → 2 habilidades
//   PLATINUM → 3 habilidades
//   MYTHIC   → 4 habilidades
// ─────────────────────────────────────────────────────────────────────

// Ícono MTG según tipo de habilidad
const ABILITY_ICON: Record<string, string> = {
  PASSIVE: '◆',
  TRIGGERED: '⟡',
  ACTIVATED: '❂',
  KEYWORD: '◈',
};

// Color del keyword según categoría de la habilidad
const ABILITY_COLOR: Record<string, string> = {
  COMBAT_OFFENSE: 'text-red-400',
  COMBAT_DEFENSE: 'text-blue-400',
  COMBAT_MOBILITY: 'text-amber-400',
  RESOURCE_DRAW: 'text-emerald-400',
  RESOURCE_ENERGY: 'text-yellow-400',
  SYNERGY_GENRE: 'text-violet-400',
  SYNERGY_ALBUM: 'text-fuchsia-400',
  SYNERGY_PLAYLIST: 'text-pink-400',
  UTILITY_SEARCH: 'text-teal-400',
  UTILITY_MANIPULATION: 'text-cyan-400',
  UTILITY_INFORMATION: 'text-sky-300',
  CONTROL_TARGET: 'text-orange-400',
  CONTROL_BOARD: 'text-red-500',
  CONTROL_META: 'text-indigo-400',
  SPECIAL_LEGENDARY: 'text-purple-400',
  SPECIAL_CONDITIONAL: 'text-lime-400',
  SPECIAL_TRANSFORM: 'text-sky-400',
};

// Estilos del marco por rareza
const RARITY_STYLES: Record<string, { border: string; glow: string; bg: string; nameColor: string; gradient: string }> = {
  BRONZE: {
    border: 'border-[#cd7f32]/50',
    glow: 'shadow-[0_0_15px_rgba(205,127,50,0.3)]',
    bg: 'bg-zinc-900',
    nameColor: 'text-white',
    gradient: 'from-[#cd7f32]/15 to-transparent',
  },
  SILVER: {
    border: 'border-[#c0c0c0]/60',
    glow: 'shadow-[0_0_18px_rgba(192,192,192,0.4)]',
    bg: 'bg-slate-900',
    nameColor: 'text-white',
    gradient: 'from-[#c0c0c0]/12 to-transparent',
  },
  GOLD: {
    border: 'border-[#ffd700]/70',
    glow: 'shadow-[0_0_25px_rgba(255,215,0,0.5)]',
    bg: 'bg-stone-950',
    nameColor: 'text-amber-200',
    gradient: 'from-[#ffd700]/18 via-[#b8860b]/8 to-transparent',
  },
  PLATINUM: {
    border: 'border-cyan-400/80',
    glow: 'shadow-[0_0_30px_rgba(0,255,255,0.6)]',
    bg: 'bg-cyan-950',
    nameColor: 'text-cyan-200',
    gradient: 'from-cyan-400/20 via-cyan-600/8 to-transparent',
  },
  MYTHIC: {
    border: 'border-purple-500/90',
    glow: 'shadow-[0_0_45px_rgba(168,85,247,0.9)] ring-2 ring-purple-500/30',
    bg: 'bg-zinc-950',
    nameColor: 'text-purple-200',
    gradient: 'from-purple-500/25 via-fuchsia-800/12 to-transparent',
  },
};

// Badge "tipo de habilidad" en español
const ABILITY_BADGE: Record<string, string> = {
  PASSIVE: 'Pasivo',
  TRIGGERED: 'Activado',
  ACTIVATED: 'Activado',
  KEYWORD: 'Regla',
};

// Trigger en español
const TRIGGER_TEXT: Record<string, string> = {
  ON_PLAY: 'Al entrar al campo',
  ON_ATTACKED: 'Al ser atacado',
  ON_ATTACK: 'Al atacar',
  ON_DESTROYED: 'Al ser destruido',
  ON_SACRIFICE: 'Al sacrificarse',
  ON_REACTION: 'Como reacción',
  PASSIVE: '',
};

function formatAbility(ability: any) {
  const type = ability.abilityType || 'PASSIVE';
  const icon = ABILITY_ICON[type] || '◆';
  const color = ABILITY_COLOR[ability.category] || 'text-white/80';
  const badge = ABILITY_BADGE[type] || 'Habilidad';
  const trigger = TRIGGER_TEXT[ability.trigger || 'PASSIVE'] || '';
  const desc = ability.description || '';
  const fullDesc = trigger ? `${trigger}: ${desc}` : desc;

  return { icon, keyword: ability.keyword || '', badge, description: fullDesc, color, type };
}

export default function Card({
  data, className = '', onDoubleClick, isBig = false, disableHover = false, onArtistClick
}: CardProps) {
  const { inventory } = usePlayerStore();
  const [imgError, setImgError] = useState(false);
  const [showBigCard, setShowBigCard] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ownedCount = useMemo(() => inventory[data.id]?.count || 0, [inventory, data.id]);
  const rs = RARITY_STYLES[data.rarity] || RARITY_STYLES.BRONZE;
  const isEvent = data.type === 'EVENT';
  const hasAbilities = data.abilities && data.abilities.length > 0;

  // ── Artwork enrichment & Alt Art ─────────────────────────────────────
  const inventoryItem = useMemo(() => inventory[data.id], [inventory, data.id]);
  const useAltArt = inventoryItem?.useAltArt ?? false;
  const altArtUrl = inventoryItem?.altArtUrl;

  const { url: defaultArtworkUrl, variant } = useMemo(
    () => getBestArtworkSync(data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.id, data.artworkUrl, data.videoId]
  );

  const displayArtwork = (useAltArt && altArtUrl) ? altArtUrl : defaultArtworkUrl;

  const handleMouseEnter = () => {
    if (isBig || disableHover) return;
    const delay = window.innerWidth < 768 ? 700 : 1300;
    hoverTimeoutRef.current = setTimeout(() => setShowBigCard(true), delay);
  };
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowBigCard(false);
  };
  useEffect(() => () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }, []);

  // ── Dot counter (copies owned) ─────────────────────────────────────
  const renderDotCounter = () => {
    if (ownedCount <= 1 || isBig) return null;
    return (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-40 pointer-events-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rotate-45 border border-white/30 ${i < ownedCount
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300/50 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
            : 'bg-black/60 opacity-20'
            }`} />
        ))}
      </div>
    );
  };

  const cardEl = (
    <motion.div
      onDoubleClick={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={(!isBig && !disableHover) ? { scale: 1.03, y: -3 } : {}}
      className={`
        relative
        ${isBig ? 'w-[21rem] xs:w-[24rem] sm:w-[26rem] md:w-[28rem] lg:w-[30rem]' : 'card-mobile sm:card-tablet md:card-desktop'}
        aspect-[2.5/3.5] rounded-2xl border-2 overflow-hidden flex flex-col
        ${rs.border} ${rs.glow} ${rs.bg}
        transition-all duration-300
        ${className}
      `}
      style={{ '--theme-color': data.themeColor } as React.CSSProperties}
    >
      {/* ── TOP BADGES ────────────────────────────────────────── */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-20 pointer-events-none">
        <div className="bg-black/85 backdrop-blur-xl px-2 py-0.5 rounded-lg border border-white/20 flex items-center gap-1 shadow-lg">
          <Music className={`text-cyan-400 ${isBig ? 'w-4 h-4' : 'w-3 h-3'}`} />
          <span className={`font-black text-white ${isBig ? 'text-lg' : 'text-xs sm:text-sm'}`}>{data.cost}</span>
        </div>
        {data.rarity === 'MYTHIC' && (
          <div className="bg-purple-500/30 border border-purple-400/50 px-1.5 py-0.5 rounded-lg">
            <Star className="w-3 h-3 text-purple-300 fill-purple-300" />
          </div>
        )}
      </div>

      {/* ── ART SECTION ───────────────────────────────────────── */}
      <div className={`relative ${isBig ? 'h-[44%]' : 'h-[50%]'} w-full bg-black overflow-hidden group`}>
        {displayArtwork && !imgError ? (
          <>
            <Image
              src={displayArtwork}
              alt={data.name}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isEvent ? 'opacity-40 grayscale-[0.2] contrast-125' : ''}`}
              style={{
                objectPosition: variant.objectPosition,
                filter: variant.filter,
              }}
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
            />
            {/* Subtle color overlay per-track */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
              style={{ backgroundColor: variant.overlayColor, opacity: variant.overlayOpacity }}
            />
            {isEvent && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AnimatePresence>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="w-32 h-32 border border-purple-500/20 rounded-full flex items-center justify-center"
                  >
                    <Star className="text-purple-500/30 w-12 h-12" />
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            {isEvent ? <Star className="w-10 h-10 text-purple-600/30 animate-pulse" /> : <Music className="w-10 h-10 text-gray-500" />}
          </div>
        )}

        {isBig && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Vignette */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* Format badge */}
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/70 backdrop-blur-sm text-white/70 text-[9px] uppercase font-black px-2 py-0.5 rounded border border-white/10 tracking-widest leading-none">
            {data.format || 'SINGLE'}{isEvent ? ' · EVENT' : ''}
          </span>
        </div>
      </div>

      {/* ── NAME + ARTIST ─────────────────────────────────────── */}
      <div className={`relative px-3 pt-2.5 pb-1.5 flex flex-col gap-0.5 bg-gradient-to-b ${rs.gradient}`}>
        <h3 className={`font-black ${rs.nameColor} ${isBig ? 'text-xl' : 'text-base'} leading-none line-clamp-2 tracking-tight`}>
          {data.name}
        </h3>
        <p
          className={`text-orange-400/90 ${isBig ? 'text-xs' : 'text-[10px]'} font-black uppercase tracking-widest line-clamp-1 ${onArtistClick ? 'cursor-pointer hover:text-orange-300' : ''}`}
          onClick={(e) => { if (onArtistClick) { e.stopPropagation(); onArtistClick(data.artist); } }}
        >
          {data.artist}
        </p>
      </div>

      {/* ── ORACLE TEXT — Estilo Magic: The Gathering ─────────── */}
      <div className={`flex-1 px-3 py-2 overflow-hidden flex flex-col ${isBig ? 'text-xs' : 'text-[10px]'} leading-snug`}>
        <div className="h-px bg-white/10 mb-2" />

        {hasAbilities ? (
          <div className="space-y-2 overflow-y-auto pr-0.5 scrollbar-none flex-1">
            {data.abilities.map((ability: any, idx: number) => {
              const { icon, keyword, badge, description, color, type } = formatAbility(ability);
              const isActivated = type === 'ACTIVATED';
              return (
                <div
                  key={idx}
                  className={`relative pl-3 border-l ${isEvent ? 'border-purple-500/50' : isActivated ? 'border-yellow-400/40' : 'border-white/10'}`}
                >
                  {/* Keyword header */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-white/25 font-mono text-[9px] select-none shrink-0">{icon}</span>
                    {keyword && (
                      <span className={`font-black uppercase text-[9px] tracking-widest ${color} shrink-0`}>
                        {keyword}
                      </span>
                    )}
                    <span className="text-white/20 text-[8px] italic">({badge})</span>
                  </div>
                  {/* Oracle description */}
                  <p className="text-white/55 leading-relaxed">
                    {description}
                  </p>
                  {/* Activation cost (only for ACTIVATED) */}
                  {isActivated && ability.activationCost != null && ability.activationCost > 0 && (
                    <div className="inline-flex items-center gap-0.5 mt-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded px-1 py-0.5">
                      <Zap className="w-2 h-2 text-yellow-400" />
                      <span className="text-yellow-300 text-[8px] font-black">{ability.activationCost} Energía</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/20 italic text-center mt-2 flex-1">
            Sin habilidades rítmicas.
          </p>
        )}
      </div>

      {/* ── FOOTER: ATK / DEF / GENRE ─────────────────────────── */}
      <div className="px-3 pb-3 pt-1.5 border-t border-white/8 flex justify-between items-center mt-auto shrink-0">
        {!isEvent ? (
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 rounded-xl border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
              <Shield className={`text-red-500 ${isBig ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
              <span className={`font-[900] text-white ${isBig ? 'text-lg' : 'text-xs'}`}>{data.stats?.atk || data.atk || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 rounded-xl border border-teal-500/20 shadow-[0_0_10px_rgba(45,212,191,0.1)]">
              <Shield className={`text-teal-400 ${isBig ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
              <span className={`font-[900] text-white ${isBig ? 'text-lg' : 'text-xs'}`}>{data.stats?.def || data.def || 0}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-purple-400">
            <Sparkles className="w-4 h-4 fill-current drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">EVENTO</span>
          </div>
        )}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 truncate max-w-[100px] group-hover:text-white/20 transition-colors">
          {data.genre}
        </span>
      </div>
    </motion.div>
  );

  return (
    <>
      <div className="relative inline-block">
        {renderDotCounter()}
        {cardEl}

        {/* ── BIG CARD HOVER PREVIEW ──────────────────────────── */}
        <AnimatePresence>
          {showBigCard && !isBig && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed z-[200] inset-0 pointer-events-none flex items-center justify-center bg-black/85 backdrop-blur-2xl"
            >
              <motion.div
                initial={{ scale: 0.85, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="pointer-events-auto drop-shadow-[0_0_80px_rgba(0,0,0,1)]"
              >
                <Card data={data} isBig={true} disableHover={true} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
