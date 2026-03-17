import { CardData } from '@/lib/engine/generator';
import { Music } from 'lucide-react';

interface MiniCardProps {
  data: CardData;
  className?: string;
}

export default function MiniCard({ data, className = '' }: MiniCardProps) {
  const rarityGlow = {
    BRONZE: 'border-[#cd7f32]/50',
    SILVER: 'border-[#c0c0c0]/60',
    GOLD: 'border-[#ffd700]/80',
    PLATINUM: 'border-cyan-400',
  }[data.rarity];

  return (
    <div className={`relative aspect-square bg-[#1a1a1a] rounded-xl overflow-hidden flex flex-col border-2 ${rarityGlow} transition-transform hover:scale-105 ${className}`}>
      <div className="absolute top-1 right-1 z-20 bg-black/80 backdrop-blur-md rounded-full w-6 h-6 flex items-center justify-center border border-white/20 shadow-lg">
        <span className="text-white font-bold text-xs">{data.cost}</span>
      </div>
      
      <div className="absolute inset-0 w-full h-full bg-black">
        {data.artUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.artUrl} alt={data.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800"><Music className="w-8 h-8 text-gray-500" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col justify-end z-10">
        <h3 className="font-bold text-white text-xs leading-tight line-clamp-1">{data.name}</h3>
        {data.type === 'CREATURE' && data.stats && (
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] font-bold text-red-400">{data.stats.atk}</span>
            <span className="text-[10px] font-bold text-blue-400">{data.stats.def}</span>
          </div>
        )}
      </div>
    </div>
  );
}
