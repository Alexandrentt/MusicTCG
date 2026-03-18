import { CardData } from '@/lib/engine/generator';
import { Zap, Shield, Music, X, Mic2, Star } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { t } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CardProps {
  data: CardData;
  className?: string;
  onDoubleClick?: () => void;
  isBig?: boolean;
  disableHover?: boolean;
}

export default function Card({ data, className = '', onDoubleClick, isBig = false, disableHover = false }: CardProps) {
  const { language } = usePlayerStore();
  const [imgError, setImgError] = useState(false);
  const [showBigCard, setShowBigCard] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const rarityGlow = {
    BRONZE: 'shadow-[0_0_15px_rgba(205,127,50,0.3)] border-[#cd7f32]/30',
    SILVER: 'shadow-[0_0_15px_rgba(192,192,192,0.4)] border-[#c0c0c0]/40',
    GOLD: 'shadow-[0_0_20px_rgba(255,215,0,0.6)] border-[#ffd700]/60',
    PLATINUM: 'shadow-[0_0_25px_rgba(0,255,255,0.8)] border-cyan-400',
  }[data.rarity];

  const handleMouseEnter = () => {
    if (isBig || disableHover) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setShowBigCard(true);
    }, 1500); // 1.5s for better UX, user asked for 2s but 1.5s feels more responsive like Arena
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowBigCard(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const renderTopBadges = () => (
    <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-20 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-lg">
        <Zap className={`text-yellow-400 ${isBig ? 'w-4 h-4' : 'w-3 h-3'}`} />
        <span className={`font-black text-white ${isBig ? 'text-lg' : 'text-xs'}`}>{data.cost}</span>
      </div>
      <div className={`bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-lg ${data.rarity === 'PLATINUM' ? 'border-cyan-500/50' :
        data.rarity === 'GOLD' ? 'border-yellow-500/50' :
          data.rarity === 'SILVER' ? 'border-gray-400/50' : 'border-amber-600/50'
        }`}>
        <span className={`font-black text-[10px] uppercase tracking-tighter ${data.rarity === 'PLATINUM' ? 'text-cyan-400' :
          data.rarity === 'GOLD' ? 'text-yellow-400' :
            data.rarity === 'SILVER' ? 'text-gray-300' : 'text-amber-600'
          }`}>
          {data.rarity}
        </span>
      </div>
    </div>
  );

  const renderStatsFooter = () => {
    if (data.type === 'EVENT') return null;
    return (
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-1 rounded-lg border border-red-500/30">
          <Shield className={`text-red-500 ${isBig ? 'w-4 h-4' : 'w-3 h-3'}`} />
          <span className={`font-black text-white ${isBig ? 'text-lg' : 'text-xs'}`}>{data.stats.atk}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-teal-500/20 px-2 py-1 rounded-lg border border-teal-500/30">
          <Shield className={`text-teal-500 ${isBig ? 'w-4 h-4' : 'w-3 h-3'}`} />
          <span className={`font-black text-white ${isBig ? 'text-lg' : 'text-xs'}`}>{data.stats.def}</span>
        </div>
      </div>
    );
  };

  const hasAbilities = data.abilities && data.abilities.length > 0;
  const isEvent = data.type === 'EVENT';

  const cardContent = (
    <motion.div
      onDoubleClick={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={(!isBig && !disableHover) ? { scale: 1.05, y: -5 } : {}}
      className={`relative ${isBig ? 'w-80 sm:w-96' : 'w-64'} aspect-[2.5/3.5] ${isEvent ? 'bg-gradient-to-b from-[#2a1b38] to-[#1a1025] rounded-[2rem] border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'bg-[#1a1a1a] rounded-xl border-2'} overflow-hidden flex flex-col ${rarityGlow} transition-all ${className}`}
      style={{ '--theme-color': data.themeColor } as React.CSSProperties}
    >
      {renderTopBadges()}

      {/* Art Section */}
      <div className={`relative ${hasAbilities || isEvent ? 'h-[55%]' : 'h-full'} w-full bg-black ${isEvent ? 'rounded-b-[2rem] overflow-hidden border-b-4 border-[#3a2055]' : ''}`}>
        {data.artUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.artUrl.replace('http://', 'https://')}
            alt={data.name}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800"><Music className="w-12 h-12 text-gray-500" /></div>
        )}

        {/* Gradient Overlay for Full Art or Transition */}
        <div className={`absolute inset-0 bg-gradient-to-t ${hasAbilities || isEvent ? 'from-black/80 via-transparent to-transparent h-full' : 'from-black via-black/40 to-transparent'}`}></div>

        {isEvent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 mix-blend-overlay">
            <Zap className="w-32 h-32 text-purple-400" />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className={`${hasAbilities || isEvent ? 'flex-1 px-3 pt-3 pb-4 sm:pb-5' : 'absolute bottom-0 left-0 right-0 px-3 pt-3 pb-4 sm:pb-5'} flex flex-col justify-between relative z-10 ${isEvent ? '' : (hasAbilities ? 'bg-[#1a1a1a]' : '')}`}>
        <div>
          {isEvent && <div className="text-center w-full mb-1"><span className="bg-purple-600/30 text-purple-300 border border-purple-500/50 text-[9px] uppercase font-black px-2 py-0.5 rounded-full tracking-widest">Event</span></div>}
          <h3 className={`font-bold text-white ${isBig ? 'text-xl' : 'text-sm'} leading-tight line-clamp-1 ${isEvent ? 'text-center' : ''}`}>{data.name}</h3>
          <p className={`text-gray-400 ${isBig ? 'text-xs' : 'text-[10px]'} uppercase tracking-wider mt-0.5 line-clamp-1 ${isEvent ? 'text-center' : ''}`}>{data.artist}</p>

          {(hasAbilities || isEvent) && (
            <div className={`mt-2 ${isBig ? 'text-sm' : 'text-[11px]'} leading-tight text-gray-300 space-y-1.5 overflow-y-auto ${isBig ? 'max-h-[140px]' : 'max-h-[70px]'} pr-1 scrollbar-none hover:scrollbar-thin scrollbar-thumb-gray-600 ${isEvent ? 'text-center italic text-purple-200' : ''}`}>
              {data.abilities.map((ability, idx) => (
                <p key={idx}>
                  {ability.keyword && <span className={`font-bold text-white mr-1 ${isEvent ? 'text-purple-300 block mb-0.5 not-italic' : ''}`}>{t(language, 'abilities', ability.keyword)}:</span>}
                  {t(language, 'abilities', ability.description)}
                </p>
              ))}
              {isEvent && data.lyrics && isBig && (
                <div className="mt-4 pt-4 border-t border-purple-500/30 text-[10px] text-purple-300/60 font-serif">
                  {data.lyrics.split('\n').slice(0, 4).join('\n')}...
                </div>
              )}
            </div>
          )}
        </div>
        {!isEvent && renderStatsFooter()}
      </div>
    </motion.div>
  );

  return (
    <>
      {cardContent}

      {/* Big Card Overlay (Magic Arena Style) */}
      <AnimatePresence>
        {showBigCard && !isBig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[100] inset-0 pointer-events-none flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="flex flex-col lg:flex-row items-center justify-center gap-8 py-10 w-full max-w-6xl pointer-events-auto"
            >
              <div className="shrink-0 drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <Card
                  data={{ ...data, artUrl: data.artUrl?.replace('http://', 'https://') }}
                  isBig={true}
                  disableHover={true}
                />
              </div>

              {/* Extra Info Panel (Arena Style) */}
              <div className="flex flex-col gap-4 w-full sm:w-[400px] lg:w-72">
                <div className="bg-black/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                    <Music className="w-16 h-16" />
                  </div>
                  <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {t(language, 'studio', 'details')}
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 text-[9px] uppercase font-black tracking-widest block mb-1">Género</span>
                        <span className="text-white text-xs font-bold bg-white/5 px-2 py-1 rounded inline-block">{data.genre}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[9px] uppercase font-black tracking-widest block mb-1">Rareza</span>
                        <span className={`text-xs font-black uppercase ${data.rarity === 'PLATINUM' ? 'text-cyan-400' :
                          data.rarity === 'GOLD' ? 'text-yellow-400' :
                            data.rarity === 'SILVER' ? 'text-gray-300' : 'text-amber-600'
                          }`}>{data.rarity}</span>
                      </div>
                    </div>

                    {hasAbilities && (
                      <div>
                        <span className="text-gray-500 text-[9px] uppercase font-black tracking-widest block mb-1">Mecánicas</span>
                        <div className="space-y-2">
                          {data.abilities.map((a, i) => (
                            <div key={i} className="text-[11px] text-gray-300 bg-white/5 p-2 rounded border border-white/10 hover:bg-white/10 transition-colors">
                              <span className="font-bold text-white block mb-0.5">{t(language, 'abilities', a.keyword || '')}</span>
                              <span className="leading-tight block">{t(language, 'abilities', a.description)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {data.lyrics && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[400px] flex flex-col w-full sm:w-[500px] lg:w-80"
                  >
                    <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-4 border-b border-white/10 pb-3 flex items-center gap-2">
                      <Mic2 className="w-3.5 h-3.5 text-purple-400" />
                      Music Poetry / Lyrics
                    </h4>
                    <div className="flex-1 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-purple-500/50 text-[14px] leading-relaxed text-gray-300 font-serif italic whitespace-pre-wrap selection:bg-purple-500/30">
                      {data.lyrics}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
