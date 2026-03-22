import { CardData } from '@/lib/engine/generator';
import { Music, Shield } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { getBestArtworkSync } from '@/lib/engine/artworkEnricher';

interface MiniCardProps {
  data: CardData;
  className?: string;
  count?: number;
  onArtistClick?: (artist: string) => void;
}

export default function MiniCard({ data, className = '', count = 0, onArtistClick }: MiniCardProps) {
  const [imgError, setImgError] = useState(false);
  const isEvent = data.type === 'EVENT';

  const { url: artworkUrl, variant } = useMemo(
    () => getBestArtworkSync(data),
    [data.id, data.artworkUrl, data.videoId]
  );

  const rarityBorder = {
    BRONZE: 'border-[#cd7f32]/40 shadow-[0_4px_10px_rgba(205,127,50,0.1)]',
    SILVER: 'border-[#c0c0c0]/40 shadow-[0_4px_10px_rgba(192,192,192,0.1)]',
    GOLD: 'border-[#ffd700]/50 shadow-[0_4px_15px_rgba(255,215,0,0.15)]',
    PLATINUM: 'border-cyan-400/60 shadow-[0_4px_20px_rgba(34,211,238,0.2)]',
    MYTHIC: 'border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
  }[data.rarity] || 'border-white/10 shadow-xl';

  const rarityText = {
    BRONZE: 'text-[#cd7f32]',
    SILVER: 'text-[#c0c0c0]',
    GOLD: 'text-[#ffd700]',
    PLATINUM: 'text-cyan-400',
    MYTHIC: 'text-purple-400',
  }[data.rarity] || 'text-gray-400';

  const cardBg = isEvent
    ? 'bg-gradient-to-b from-[#1a1025] to-[#0a0610]'
    : 'bg-[#0f0f0f]';

  return (
    <div className={`relative ${className} group/container cursor-pointer active:scale-95 transition-transform duration-200`}>
      <div
        className={`relative aspect-[2.5/3.5] ${cardBg} rounded-[1.25rem] overflow-hidden shadow-2xl border ${rarityBorder} transition-all duration-500 group-hover/container:-translate-y-2 group-hover/container:shadow-[0_20px_40px_rgba(0,0,0,0.6)]`}
      >
        {/* Art */}
        <div className={`absolute inset-0 ${isEvent ? 'opacity-40' : ''}`}>
          {artworkUrl && !imgError ? (
            <>
              <Image
                src={artworkUrl}
                alt={data.name}
                fill
                className="object-cover opacity-60 group-hover/container:opacity-90 transition-all duration-700 transform group-hover/container:scale-125"
                style={{
                  objectPosition: variant.objectPosition,
                  filter: variant.filter,
                }}
                onError={() => setImgError(true)}
              />
              <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay"
                style={{ backgroundColor: variant.overlayColor, opacity: variant.overlayOpacity * 1.8 }}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <Music className="w-8 h-8 text-white/5 animate-pulse" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent opacity-90" />
        </div>

        {/* Badges superiores: Energía + Rareza */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10 translate-y-0 group-hover/container:-translate-y-0.5 transition-transform duration-300">
          <div className="bg-black/90 backdrop-blur-xl px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-2xl transform active:scale-90 transition-all">
            <Music className="w-3 h-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
            <span className="text-xs font-[900] text-white tracking-widest leading-none translate-y-[1px]">{data.cost}</span>
          </div>
          <div className={`px-2 py-0.5 rounded-lg bg-black/90 backdrop-blur-md border border-white/5 text-[8px] font-black uppercase tracking-[0.2em] shadow-lg ${rarityText}`}>
            {isEvent ? 'EVENT' : data.rarity}
          </div>
        </div>

        {/* Info inferior */}
        <div className="absolute bottom-2 left-2 right-2 z-10 space-y-1.5">
          <div className="group-hover/container:translate-x-1 transition-transform duration-300">
            <h3 className="text-[11px] font-black text-white leading-tight truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide uppercase">
              {data.name}
            </h3>
            <p
              className={`text-[9px] text-gray-500 truncate tracking-[0.1em] uppercase font-bold transition-colors group-hover/container:text-gray-300`}
            >
              {data.artist}
            </p>
          </div>

          {!isEvent && (
            <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-1.5 rounded-xl border border-white/10 group-hover/container:bg-white/10 transition-colors">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">{data.stats?.atk ?? 0}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/30 border border-red-500/50" />
              </div>
              <div className="flex items-center gap-1.5 text-right">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400/30 border border-teal-400/50" />
                <span className="text-[11px] font-black text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]">{data.stats?.def ?? 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Gloss & Overlay Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none opacity-50 group-hover/container:opacity-100 transition-opacity" />

        {/* Hover Highlight Ring */}
        <div className={`absolute inset-0 border-2 border-white/0 group-hover/container:border-white/10 rounded-[1.25rem] transition-all duration-500 pointer-events-none`} />
      </div>

      {/* Footer count indicator if needed */}
      {count > 1 && (
        <div className="absolute -bottom-2 -right-2 bg-white text-black px-2 py-1 rounded-lg text-[10px] font-black shadow-2xl z-20 border border-black/10">
          x{count}
        </div>
      )}
    </div>
  );
}

