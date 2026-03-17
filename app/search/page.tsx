'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Play } from 'lucide-react';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import { logDiscovery } from '@/lib/discovery';
import { auth } from '@/lib/firebase';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'artistTerm' | 'albumTerm' | 'songTerm'>('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const { playTrack } = useMusicPlayer();
  const { language, discoveryUsername } = usePlayerStore();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        let url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`;
        if (searchFilter !== 'all') {
          url += `&attribute=${searchFilter}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Error fetching from iTunes API:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchFilter]);

  const handleSelectTrack = (track: any) => {
    const card = generateCard(track);
    setSelectedCard(card);
    
    // Log discovery
    const playerName = discoveryUsername || auth.currentUser?.displayName || (language === 'es' ? 'Un Jugador' : 'A Player');
    logDiscovery(card, playerName);
  };

  const handleCraft = () => {
    if (!selectedCard) return;
    const { craftCard } = usePlayerStore.getState();
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
      playTrack({
        id: card.id,
        url: card.previewUrl,
        title: card.name,
        artist: card.artist,
        artUrl: card.artUrl
      });
    } else {
      toast.error(t(language, 'search', 'noPreview') || "Esta canción no tiene vista previa disponible.");
    }
  };

  return (
    <div className="flex flex-col gap-6 relative min-h-screen">
      <h1 className="text-3xl font-bold">{t(language, 'search', 'title') || 'La Disquera'}</h1>
      <p className="text-gray-400 text-sm -mt-4">{t(language, 'search', 'subtitle') || 'Busca cualquier canción del mundo para ver su carta.'}</p>
      
      <div className="relative z-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-12 pr-4 py-3 border-none rounded-full bg-[#242424] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:bg-[#2a2a2a] transition-colors"
          placeholder={t(language, 'search', 'placeholder') || "Artistas, canciones o géneros"}
        />
      </div>

      {/* Minimalist Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mt-2 z-10">
        <button 
          onClick={() => setSearchFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${searchFilter === 'all' ? 'bg-white text-black' : 'bg-[#242424] text-gray-400 hover:bg-[#333] hover:text-white'}`}
        >
          {t(language, 'search', 'all') || 'Todo'}
        </button>
        <button 
          onClick={() => setSearchFilter('songTerm')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${searchFilter === 'songTerm' ? 'bg-white text-black' : 'bg-[#242424] text-gray-400 hover:bg-[#333] hover:text-white'}`}
        >
          {t(language, 'search', 'songs') || 'Canciones'}
        </button>
        <button 
          onClick={() => setSearchFilter('artistTerm')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${searchFilter === 'artistTerm' ? 'bg-white text-black' : 'bg-[#242424] text-gray-400 hover:bg-[#333] hover:text-white'}`}
        >
          {t(language, 'search', 'artists') || 'Artistas'}
        </button>
        <button 
          onClick={() => setSearchFilter('albumTerm')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${searchFilter === 'albumTerm' ? 'bg-white text-black' : 'bg-[#242424] text-gray-400 hover:bg-[#333] hover:text-white'}`}
        >
          {t(language, 'search', 'albums') || 'Álbumes'}
        </button>
      </div>

      {/* Results List */}
      {query.length >= 2 && !selectedCard && (
        <div className="mt-2 space-y-2 z-10">
          {results.map((track) => (
            <div 
              key={track.trackId}
              onClick={() => handleSelectTrack(track)}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#242424] cursor-pointer transition-colors group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={track.artworkUrl60 || track.artworkUrl100} 
                alt={track.collectionName} 
                className="w-12 h-12 rounded object-cover shadow-md"
                crossOrigin="anonymous"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate group-hover:text-green-400 transition-colors">{track.trackName}</p>
                <p className="text-gray-400 text-sm truncate">{track.artistName} • {track.primaryGenreName}</p>
              </div>
            </div>
          ))}
          {results.length === 0 && !loading && (
            <p className="text-gray-500 text-center py-8">{t(language, 'search', 'noResults') || 'No se encontraron resultados.'}</p>
          )}
        </div>
      )}

      {/* Selected Card Modal / Expanded View */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 max-w-md w-full animate-in fade-in zoom-in duration-300">
            <div className="relative group">
              <Card data={selectedCard} className="w-72 sm:w-80" />
              {selectedCard.previewUrl && (
                <button 
                  onClick={() => handlePlayPreview(selectedCard)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded-xl"
                >
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                    <Play size={32} className="text-white ml-1" fill="currentColor" />
                  </div>
                </button>
              )}
            </div>
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setSelectedCard(null)}
                className="flex-1 py-3 rounded-full font-bold text-white bg-[#242424] hover:bg-[#333] transition-colors"
              >
                {t(language, 'search', 'back') || 'Volver'}
              </button>
              <button 
                onClick={handleCraft}
                className="flex-1 py-3 rounded-full font-bold text-black bg-white hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <span>{t(language, 'search', 'hire') || 'Contratar'}</span>
                <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">1 {selectedCard.rarity}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder Categories (Only show when not searching) */}
      {query.length < 2 && (
        <div className="mt-4 z-0">
          <h2 className="text-xl font-bold mb-4">{t(language, 'search', 'exploreAll') || 'Explorar todo'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-600 rounded-lg p-4 h-24 font-bold overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setQuery('Rock')}>
              <span className="absolute top-4 left-4 text-lg">{t(language, 'search', 'rock') || 'Rock'}</span>
            </div>
            <div className="bg-blue-600 rounded-lg p-4 h-24 font-bold overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setQuery('Pop')}>
              <span className="absolute top-4 left-4 text-lg">{t(language, 'search', 'pop') || 'Pop'}</span>
            </div>
            <div className="bg-green-600 rounded-lg p-4 h-24 font-bold overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setQuery('Hip-Hop')}>
              <span className="absolute top-4 left-4 text-lg">{t(language, 'search', 'hiphop') || 'Hip-Hop'}</span>
            </div>
            <div className="bg-purple-600 rounded-lg p-4 h-24 font-bold overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setQuery('Electronic')}>
              <span className="absolute top-4 left-4 text-lg">{t(language, 'search', 'electronic') || 'Electrónica'}</span>
            </div>
            <div className="bg-orange-600 rounded-lg p-4 h-24 font-bold overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setQuery('Latino')}>
              <span className="absolute top-4 left-4 text-lg">{t(language, 'search', 'latin') || 'Latino'}</span>
            </div>
            <div className="bg-teal-600 rounded-lg p-4 h-24 font-bold overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setQuery('Indie')}>
              <span className="absolute top-4 left-4 text-lg">{t(language, 'search', 'indie') || 'Indie'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
