import { CardData } from '@/lib/engine/generator';
import { Zap, Shield, Music, Play, Mic2, Star, TrendingUp, Heart } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { t } from '@/lib/i18n';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CardProps {
  data: CardData;
  className?: string;
  onDoubleClick?: () => void;
  isBig?: boolean;
  disableHover?: boolean;
  onArtistClick?: (artist: string) => void;
}

export default function Card({ data, className = '', onDoubleClick, isBig = false, disableHover = false, onArtistClick }: CardProps) {
  const { language, inventory } = usePlayerStore();
  const [imgError, setImgError] = useState(false);
  const [showBigCard, setShowBigCard] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Count owned logic for the minimalist dot counter
  const ownedCount = useMemo(() => {
    return inventory[data.id]?.count || 0;
  }, [inventory, data.id]);

  const rarityStyles = {
    BRONZE: 'shadow-[0_0_15px_rgba(205,127,50,0.3)] border-[#cd7f32]/40 bg-zinc-900',
    SILVER: 'shadow-[0_0_15px_rgba(192,192,192,0.4)] border-[#c0c0c0]/50 bg-slate-900',
    GOLD: 'shadow-[0_0_20px_rgba(255,215,0,0.5)] border-[#ffd700]/70 bg-stone-900',
    PLATINUM: 'shadow-[0_0_25px_rgba(0,255,255,0.7)] border-cyan-400/80 bg-cyan-950',
    MYTHIC: 'shadow-[0_0_40px_rgba(168,85,247,0.8)] border-purple-500/90 bg-zinc-950 ring-2 ring-purple-500/40',
  }[data.rarity];

  const handleMouseEnter = () => {
    if (isBig || disableHover) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setShowBigCard(true);
    }, 1200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowBigCard(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const renderDotCounter = () => {
    if (ownedCount <= 1 || isBig) return null;
    return (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1 z-40 pointer-events-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rotate-45 border-2 transition-all duration-300 shadow-2xl ${i < ownedCount
              ? 'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300/60 shadow-[0_0_10px_rgba(249,115,22,0.9)]'
              : 'bg-black/70 border-white/10 opacity-30'
              }`}
          />
        ))}
      </div>
    );
  };

  const renderTopBadges = () => (
    <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20 pointer-events-none">
      {/* Cost Badge */}
      <div className="bg-black/80 backdrop-blur-xl px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-2xl">
        <Music className={`text-cyan-400 ${isBig ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} />
        <span className={`font-black text-white ${isBig ? 'text-xl' : 'text-sm'}`}>{data.cost}</span>
      </div>
    </div>
  );

  const hasAbilities = data.abilities && data.abilities.length > 0;
  const isEvent = data.type === 'EVENT';

  return (
    <>
      {/* Outer wrapper allows diamonds to overflow the card's clip */}
      <div className="relative inline-block">
        {renderDotCounter()}
        <motion.div
          onDoubleClick={onDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          whileHover={(!isBig && !disableHover) ? { scale: 1.05, y: -5 } : {}}
          className={`relative ${isBig ? 'w-80 sm:w-96' : 'w-64'} aspect-[2.5/3.5] rounded-3xl border-2 overflow-hidden flex flex-col ${rarityStyles} transition-all ${className}`}
          style={{ '--theme-color': data.themeColor } as React.CSSProperties}
        >
          {renderTopBadges()}

          {/* ART SECTION */}
          <div className={`relative ${isBig ? 'h-[50%]' : 'h-[55%]'} w-full bg-black overflow-hidden group`}>
            {data.artworkUrl && !imgError ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.artworkUrl.replace('http://', 'https://')}
                  alt={data.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  crossOrigin="anonymous"
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Music className="w-12 h-12 text-gray-500" /></div>
            )}

            {/* PLAY BUTTON (Only on Big) */}
            {isBig && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  className="w-16 h-16 bg-white/20 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all group"
                  onClick={(e) => { e.stopPropagation(); /* Logic to play music */ }}
                >
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </button>
              </div>
            )}

            {/* VIGNETTE & INFO OVERLAY */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/60 to-transparent" />

            {/* Format Badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="bg-white/10 backdrop-blur-md text-white/80 text-[10px] uppercase font-black px-2 py-0.5 rounded-md border border-white/10 tracking-widest leading-none">
                {data.format || 'Single'} {isEvent ? `[${data.type}]` : ''}
              </span>
            </div>
          </div>

          {/* INFO SECTION */}
          <div className="flex-1 px-4 py-4 flex flex-col bg-zinc-950/40 relative">
            <div className="space-y-1 mb-3">
              <h3 className={`font-black text-white ${isBig ? 'text-2xl' : 'text-lg'} leading-none line-clamp-2 tracking-tight`}>{data.name}</h3>
              <p
                className={`text-orange-500/80 ${isBig ? 'text-sm' : 'text-xs'} font-black uppercase tracking-widest line-clamp-1 ${onArtistClick ? 'cursor-pointer hover:text-orange-400 hover:underline' : ''}`}
                onClick={(e) => {
                  if (onArtistClick) {
                    e.stopPropagation();
                    onArtistClick(data.artist);
                  }
                }}
              >
                {data.artist}
              </p>
            </div>

            <div className={`flex-1 ${isBig ? 'text-sm' : 'text-[11px]'} leading-snug text-gray-300 overflow-y-auto pr-1 scrollbar-none`}>
              {hasAbilities ? (
                <div className="space-y-2">
                  {data.abilities.map((ability, idx) => (
                    <div key={idx} className={`${isEvent ? 'border-l-2 border-purple-500 pl-2 italic' : ''}`}>
                      {ability.keyword && <span className="font-bold text-white mr-1 uppercase text-[10px] tracking-widest">{t(language, 'abilities', ability.keyword || '')}:</span>}
                      {t(language, 'abilities', ability.description || '')}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="opacity-40 italic">{t(language, 'studio', 'noAbilities') || 'Sin habilidades rítmicas detectadas...'}</p>
              )}
            </div>

            {/* STATS FOOTER BAR */}
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
              {!isEvent ? (
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
                    <Shield className={`text-red-500 ${isBig ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    <span className={`font-black text-white ${isBig ? 'text-xl' : 'text-sm'}`}>{data.atk}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <Shield className={`text-cyan-500 ${isBig ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    <span className={`font-black text-white ${isBig ? 'text-xl' : 'text-sm'}`}>{data.def}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-purple-400 font-black uppercase text-[10px] tracking-[0.2em]">
                  <Star className="w-3 h-3" />
                  Event
                </div>
              )}

              <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                {data.genre}
              </div>
            </div>
          </div>
        </motion.div>

        {/* BIG CARD OVERLAY */}
        <AnimatePresence>
          {showBigCard && !isBig && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[100] inset-0 pointer-events-none flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                className="flex flex-col lg:flex-row items-center justify-center gap-12 py-10 w-full max-w-6xl pointer-events-auto"
              >
                <div className="shrink-0 drop-shadow-[0_0_80px_rgba(0,0,0,1)]">
                  <Card
                    data={data}
                    isBig={true}
                    disableHover={true}
                  />
                </div>

                {/* Extra Info Panel */}
                <div className="flex flex-col gap-6 w-full max-w-md">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h4 className="text-white/40 font-black text-[10px] uppercase tracking-[0.4em] mb-6 border-b border-white/5 pb-4">Studio Master Data</h4>

                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="space-y-1">
                          <label className="text-white/20 text-[9px] font-black uppercase tracking-widest">Format</label>
                          <div className="text-white font-black text-lg">{data.format}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-white/20 text-[9px] font-black uppercase tracking-widest">Heritage</label>
                          <div className="text-orange-500 font-black text-lg">{data.heritage?.heritageRole || 'MASTER'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-3xl shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white/40 font-black text-[10px] uppercase tracking-[0.4em]">Lyrics & Visuals</h4>
                      <Heart className="w-4 h-4 text-white/20" />
                    </div>
                    <p className="text-sm text-gray-400 font-serif italic leading-relaxed line-clamp-4">
                      {data.lyrics || "Visual rhythm detected. No textual lyrics archived for this frequency."}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
