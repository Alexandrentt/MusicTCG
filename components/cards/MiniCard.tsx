import { CardData } from '@/lib/engine/generator';
import { Zap, Shield } from 'lucide-react';

interface MiniCardProps {
  data: CardData;
  className?: string;
  count?: number;
  onArtistClick?: (artist: string) => void;
}

export default function MiniCard({ data, className = '', count = 0, onArtistClick }: MiniCardProps) {
  const isEvent = data.type === 'EVENT';

  const rarityBorder = {
    BRONZE: 'border-[#cd7f32]/40',
    SILVER: 'border-[#c0c0c0]/40',
    GOLD: 'border-[#ffd700]/50',
    PLATINUM: 'border-cyan-400/60',
    MYTHIC: 'border-purple-500/60',
  }[data.rarity] || 'border-gray-500/40';

  const rarityText = {
    BRONZE: 'text-[#cd7f32]',
    SILVER: 'text-[#c0c0c0]',
    GOLD: 'text-[#ffd700]',
    PLATINUM: 'text-cyan-400',
    MYTHIC: 'text-purple-400',
  }[data.rarity] || 'text-gray-400';

  // Fondo diferente para eventos
  const cardBg = isEvent
    ? 'bg-gradient-to-b from-[#2a1b38] to-[#1a1025]'
    : 'bg-[#1a1a1a]';

  const artSrc = data.artworkUrl?.replace('http://', 'https://') || '';

  return (
    <div className={`relative ${className}`}>
      {/* Diamond Count Overlay (Magic style) */}
      {count > 1 && (
        <div className="absolute -top-2 -right-2 z-[30] bg-[#1a1a1a] border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] w-7 h-7 flex items-center justify-center transform rotate-45">
          <span className="text-white text-[12px] font-black -rotate-45">{count}</span>
        </div>
      )}

      <div
        className={`relative aspect-[2.5/3.5] ${cardBg} rounded-xl overflow-hidden shadow-2xl border-2 ${rarityBorder} group transition-all duration-300`}
      >
        {/* Art */}
        <div className={`absolute inset-0 ${isEvent ? 'opacity-50' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {artSrc ? (
            <img
              src={artSrc}
              alt={data.name}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
              crossOrigin="anonymous"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <Zap className="w-8 h-8 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>

        {/* Badges superiores: Energía + Rareza */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-start z-10">
          <div className="bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 shadow-lg">
            <Zap className="w-2.5 h-2.5 text-yellow-500" />
            <span className="text-[10px] font-black text-white">{data.cost}</span>
          </div>
          <div className={`px-1.5 py-0.5 rounded-lg bg-black/80 border border-white/10 text-[7px] font-black uppercase tracking-tighter ${rarityText}`}>
            {isEvent ? 'EVENT' : data.rarity}
          </div>
        </div>

        {/* Icono purpura para eventos */}
        {isEvent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <Zap className="w-16 h-16 text-purple-400" />
          </div>
        )}

        {/* Info inferior */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
          <h3 className="text-[10px] font-bold text-white leading-none truncate drop-shadow-md mb-0.5">{data.name}</h3>
          <p
            className={`text-[8px] text-gray-400 truncate tracking-tight uppercase font-medium mb-1 ${onArtistClick ? 'hover:underline cursor-pointer hover:text-white transition-colors' : ''}`}
            onClick={(e) => {
              if (onArtistClick) {
                e.stopPropagation();
                onArtistClick(data.artist);
              }
            }}
          >
            {data.artist}
          </p>

          {/* Evento: muestra el nombre del keyword en vez de stats */}
          {isEvent ? (
            data.abilities?.[0]?.keyword ? (
              <div className="bg-purple-900/50 border border-purple-500/30 rounded-md px-1.5 py-0.5">
                <p className="text-[8px] text-purple-300 font-bold truncate">
                  {data.abilities[0].keyword}
                </p>
              </div>
            ) : (
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-md px-1.5 py-0.5">
                <p className="text-[8px] text-purple-400 font-bold">Evento</p>
              </div>
            )
          ) : (
            /* Criatura: muestra ATK/DEF */
            <div className="flex justify-between items-center bg-black/60 backdrop-blur-sm p-1 rounded-md border border-white/5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-red-500 drop-shadow-sm">{data.stats?.atk ?? 0}</span>
                <Shield className="w-2 h-2 text-red-500 opacity-70" />
              </div>
              <div className="flex items-center gap-1 text-right">
                <span className="text-[10px] font-black text-teal-400 drop-shadow-sm">{data.stats?.def ?? 0}</span>
                <Shield className="w-2 h-2 text-teal-400 opacity-70" />
              </div>
            </div>
          )}
        </div>

        {/* Gloss */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

        {/* Borde resplandeciente para eventos */}
        {isEvent && (
          <div className="absolute inset-0 rounded-xl ring-1 ring-purple-500/20 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
