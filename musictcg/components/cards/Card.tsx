import { CardData } from '@/lib/engine/generator';
import { Zap, Shield, Music, X } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { t } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CardProps {
  data: CardData;
  className?: string;
  onDoubleClick?: () => void;
  isBig?: boolean;
}

export default function Card({ data, className = '', onDoubleClick, isBig = false }: CardProps) {
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
    if (isBig) return;
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
      <div className={`bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-lg ${
        data.rarity === 'PLATINUM' ? 'border-cyan-500/50' : 
        data.rarity === 'GOLD' ? 'border-yellow-500/50' : 
        data.rarity === 'SILVER' ? 'border-gray-400/50' : 'border-amber-600/50'
      }`}>
        <span className={`font-black text-[10px] uppercase tracking-tighter ${
          data.rarity === 'PLATINUM' ? 'text-cyan-400' : 
          data.rarity === 'GOLD' ? 'text-yellow-400' : 
          data.rarity === 'SILVER' ? 'text-gray-300' : 'text-amber-600'
        }`}>
          {data.rarity}
        </span>
      </div>
    </div>
  );

  const renderStatsFooter = () => (
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

  const hasAbilities = data.abilities && data.abilities.length > 0;

  const cardContent = (
    <div 
      onDoubleClick={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${isBig ? 'w-80 sm:w-96' : 'w-64'} aspect-[2.5/3.5] bg-[#1a1a1a] rounded-xl overflow-hidden flex flex-col border-2 ${rarityGlow} transition-transform ${!isBig && 'hover:scale-105'} ${className}`} 
      style={{ '--theme-color': data.themeColor } as React.CSSProperties}
    >
      {renderTopBadges()}
      
      {/* Art Section */}
      <div className={`relative ${hasAbilities ? 'h-[55%]' : 'h-full'} w-full bg-black`}>
        {data.artUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={data.artUrl} 
            alt={data.name} 
            className="w-full h-full object-cover" 
            crossOrigin="anonymous" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800"><Music className="w-12 h-12 text-gray-500" /></div>
        )}
        
        {/* Gradient Overlay for Full Art or Transition */}
        <div className={`absolute inset-0 bg-gradient-to-t ${hasAbilities ? 'from-[#1a1a1a] via-transparent to-transparent h-full' : 'from-black via-black/40 to-transparent'}`}></div>
      </div>

      {/* Info Section */}
      <div className={`${hasAbilities ? 'flex-1 p-3' : 'absolute bottom-0 left-0 right-0 p-3'} flex flex-col justify-between relative z-10 ${hasAbilities ? 'bg-[#1a1a1a]' : ''}`}>
        <div>
          <h3 className={`font-bold text-white ${isBig ? 'text-xl' : 'text-sm'} leading-tight line-clamp-1`}>{data.name}</h3>
          <p className={`text-gray-400 ${isBig ? 'text-xs' : 'text-[10px]'} uppercase tracking-wider mt-0.5 line-clamp-1`}>{data.artist}</p>
          
          {hasAbilities && (
            <div className={`mt-2 ${isBig ? 'text-sm' : 'text-[11px]'} leading-tight text-gray-300 space-y-1.5 overflow-y-auto ${isBig ? 'max-h-[120px]' : 'max-h-[60px]'} pr-1 scrollbar-thin scrollbar-thumb-gray-600`}>
              {data.abilities.map((ability, idx) => (
                <p key={idx}>
                  {ability.keyword && <span className="font-bold text-white mr-1">{t(language, 'abilities', ability.keyword)}:</span>}
                  {t(language, 'abilities', ability.description)}
                </p>
              ))}
            </div>
          )}
        </div>
        {renderStatsFooter()}
      </div>
    </div>
  );

  return (
    <>
      {cardContent}

      {/* Big Card Overlay (Magic Arena Style) */}
      <AnimatePresence>
        {showBigCard && !isBig && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="relative">
              <Card data={data} isBig={true} />
              
              {/* Extra Info Panel (Arena Style) */}
              <div className="absolute left-full ml-4 top-0 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
                <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                  {t(language, 'studio', 'details')}
                </h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter block mb-1">Género</span>
                    <span className="text-white text-sm font-medium">{data.genre}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter block mb-1">Rareza</span>
                    <span className={`text-sm font-bold ${
                      data.rarity === 'PLATINUM' ? 'text-cyan-400' : 
                      data.rarity === 'GOLD' ? 'text-yellow-400' : 
                      data.rarity === 'SILVER' ? 'text-gray-300' : 'text-amber-600'
                    }`}>{data.rarity}</span>
                  </div>
                  {hasAbilities && (
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter block mb-1">Habilidades</span>
                      <div className="space-y-2">
                        {data.abilities.map((a, i) => (
                          <div key={i} className="text-xs text-gray-300 bg-white/5 p-2 rounded border border-white/5">
                            <span className="font-bold text-white block mb-0.5">{t(language, 'abilities', a.keyword || '')}</span>
                            {t(language, 'abilities', a.description)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
