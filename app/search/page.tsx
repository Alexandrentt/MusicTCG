'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LaDisqueraSearch from '@/components/discovery/LaDisqueraSearch';
import { usePlayerStore } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import { logDiscovery } from '@/lib/discovery';
import { supabase } from '@/lib/supabase';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import { Play } from 'lucide-react';
import { useMusicPlayer, Track } from '@/store/useMusicPlayer';

export default function SearchPage() {
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const { language, discoveryUsername, craftCard } = usePlayerStore();
  const { playTrack } = useMusicPlayer();

  const handleCardDiscovered = async (trackId: string) => {
    try {
      // Fetch track details from iTunes if needed, or if we have it in the cardData
      // For now, if we click, we want to see the expanded card and then craft it.
      // The search component will pass us the card data implicitly if we modify it, 
      // but let's stick to the trackId for now and refetch or use a context.

      // Since LaDisqueraSearch already has the cardData, let's modify it slightly 
      // to pass the whole card object for previewing.
      // But for now, we'll just fetch again for safety or pass it through.
      const response = await fetch(`https://itunes.apple.com/lookup?id=${trackId}`);
      const data = await response.json();
      if (data.results && data.results[0]) {
        const card = generateCard(data.results[0]);
        setSelectedCard(card);

        // Log discovery
        const { data: { session } } = await supabase.auth.getSession();
        const playerName = discoveryUsername || session?.user?.user_metadata?.full_name || (language === 'es' ? 'Un Jugador' : 'A Player');
        logDiscovery(card, playerName);
      }
    } catch (error) {
      console.error('Error selecting card from search:', error);
      toast.error('Error al cargar la carta seleccionada.');
    }
  };

  const handleCraft = () => {
    if (!selectedCard) return;
    const success = craftCard(selectedCard);
    if (success) {
      toast.success(t(language, 'search', 'hireSuccess', { name: selectedCard.name }) || `¡Has contratado a ${selectedCard.name}!`);
      setSelectedCard(null);
    } else {
      toast.error(t(language, 'search', 'hireError', { rarity: selectedCard.rarity }) || `No tienes suficientes comodines ${selectedCard.rarity} o ya tienes 4 copias.`);
    }
  };

  const handlePlayPreview = (card: CardData) => {
    if (card.previewUrl) {
      const t: any = {
        id: card.id,
        url: card.previewUrl,
        title: card.name,
        artist: card.artist,
        artworkUrl: card.artworkUrl
      };
      playTrack(t as Track);
    } else {
      toast.error(t(language, 'search', 'noPreview') || "Esta canción no tiene vista previa disponible.");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Background decoration or title if needed (though LaDisquera has its own) */}
      <LaDisqueraSearch
        isOpen={true}
        onClose={() => router.back()}
        onCardDiscovered={handleCardDiscovered}
      />

      {/* Selected Card Modal / Expanded View (Same as before but integrated) */}
      {selectedCard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-8 max-w-lg w-full animate-in fade-in zoom-in duration-300">
            <div className="relative group">
              <Card data={selectedCard} className="w-80 sm:w-96 shadow-[0_0_50px_rgba(34,211,238,0.2)]" />
              {selectedCard.previewUrl && (
                <button
                  onClick={() => handlePlayPreview(selectedCard)}
                  className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/20 transition-all rounded-2xl"
                >
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110 border border-white/20">
                    <Play size={40} className="text-white ml-2" fill="currentColor" />
                  </div>
                </button>
              )}
            </div>

            <div className="flex gap-4 w-full px-4">
              <button
                onClick={() => setSelectedCard(null)}
                className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                {t(language, 'search', 'back') || 'Volver'}
              </button>
              <button
                onClick={handleCraft}
                className="flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest text-black bg-cyan-400 hover:bg-cyan-300 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(34,211,238,0.3)]"
              >
                <span>{t(language, 'search', 'hire') || 'Contratar'}</span>
                <span className="text-[10px] bg-black/20 text-black/60 px-2 py-0.5 rounded-full border border-black/10">1 {selectedCard.rarity}</span>
              </button>
            </div>

            <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] text-center px-10">
              Al contratar esta carta, se agregará permanentemente a tu colección.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
