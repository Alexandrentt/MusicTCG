'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import Card from '@/components/cards/Card';
import MiniCard from '@/components/cards/MiniCard';
import { CardData } from '@/lib/engine/generator';
import { Trash2, Plus, Minus, X, Play, Share2, RefreshCw, Music } from 'lucide-react';
import { shareCardAsImage } from '@/lib/share';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

import DiscoveriesTab from '@/components/DiscoveriesTab';

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<'mazos' | 'coleccion' | 'descubrimientos'>('coleccion');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { playTrack } = useMusicPlayer();

  const {
    inventory,
    wildcards,
    wildcardProgress,
    decks,
    createDeck,
    deleteDeck,
    addCardToDeck,
    removeCardFromDeck,
    millCard,
    language,
    recalculateInventory
  } = usePlayerStore();

  useEffect(() => {
    if (selectedCard) {
      const fetchLyrics = async () => {
        setLoadingLyrics(true);
        try {
          const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(selectedCard.artist)}/${encodeURIComponent(selectedCard.name)}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          setLyrics(data.lyrics || null);
        } catch (e) {
          setLyrics(null);
        } finally {
          setLoadingLyrics(false);
        }
      };
      fetchLyrics();
    } else {
      setLyrics(null);
    }
  }, [selectedCard]);

  const handleSync = () => {
    if (confirm(t(language, 'studio', 'syncDesc'))) {
      recalculateInventory();
      toast.success(t(language, 'studio', 'syncMechanics') + ' OK');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [costFilter, setCostFilter] = useState<string>('all');

  const inventoryList = Object.values(inventory);
  const decksList = Object.values(decks);

  const filteredInventory = inventoryList.filter(item => {
    const card = item.card;
    const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = rarityFilter === 'all' || card.rarity === rarityFilter;
    const matchesGenre = genreFilter === 'all' || card.genre.toLowerCase().includes(genreFilter.toLowerCase());
    const matchesCost = costFilter === 'all' || card.cost === parseInt(costFilter);

    return matchesSearch && matchesRarity && matchesGenre && matchesCost;
  });

  const handleCreateDeck = () => {
    if (newDeckName.trim()) {
      createDeck(newDeckName.trim());
      setNewDeckName('');
      setShowCreateModal(false);
    }
  };

  const handleMillCard = (cardId: string) => {
    if (confirm(t(language, 'studio', 'millConfirm') || '¿Estás seguro de que quieres moler esta carta? Obtendrás progreso para un comodín de su rareza.')) {
      millCard(cardId);
      setSelectedCard(null);
      toast.success(t(language, 'studio', 'millSuccess') || 'Carta molida correctamente.');
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
      toast.error(t(language, 'studio', 'noPreview') || "Esta canción no tiene vista previa disponible.");
    }
  };

  const handleShare = async (card: CardData) => {
    try {
      toast.info(t(language, 'studio', 'generatingImage') || 'Generando imagen...');
      await shareCardAsImage('share-card-container', `card-${card.name.replace(/\s+/g, '-')}`);
      toast.success(t(language, 'studio', 'shareSuccess') || 'Imagen descargada correctamente.');
    } catch (err) {
      toast.error(t(language, 'studio', 'shareError') || 'Error al generar la imagen.');
    }
  };

  // Deck Editor View
  if (editingDeckId && decks[editingDeckId]) {
    const deck = decks[editingDeckId];
    const deckCardCount = Object.values(deck.cards).reduce((a, b) => a + b, 0);

    return (
      <div className="flex flex-col gap-6 min-h-screen pb-24">
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5 flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{deck.name}</h1>
            <p className="text-gray-400 text-sm">{t(language, 'studio', 'cardsInDeck', { count: deckCardCount }) || `${deckCardCount}/60 cartas`}</p>
          </div>
          <button
            onClick={() => setEditingDeckId(null)}
            className="px-6 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition-colors shadow-lg"
          >
            {t(language, 'studio', 'back') || 'Volver'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deck Contents */}
          <div className="lg:col-span-1 bg-[#121212] rounded-xl border border-white/10 p-4 h-[60vh] overflow-y-auto">
            <h2 className="font-bold mb-4">{t(language, 'studio', 'cardsInDeckTitle') || 'Cartas en el Mazo'}</h2>
            {Object.keys(deck.cards).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">{t(language, 'studio', 'emptyDeck') || 'El mazo está vacío.'}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(deck.cards).map(([cardId, count]) => {
                  const cardData = inventory[cardId]?.card;
                  if (!cardData) return null;
                  return (
                    <div key={cardId} className="flex items-center justify-between bg-[#242424] p-2 rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-bold bg-black px-2 py-1 rounded text-white">{count}x</span>
                        <span className="text-sm truncate">{cardData.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => removeCardFromDeck(deck.id, cardId)}
                          className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                        >
                          <Minus size={16} />
                        </button>
                        <button
                          onClick={() => addCardToDeck(deck.id, cardData)}
                          className="p-1 hover:bg-green-500/20 text-green-400 rounded"
                          disabled={count >= 4 || count >= (inventory[cardId]?.count || 0)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Collection to Add */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-4 mb-6">
              <h2 className="font-bold">{t(language, 'studio', 'yourCollection') || 'Tu Colección'}</h2>

              {/* Filters in Deck Editor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder={t(language, 'search', 'placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                />
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">{t(language, 'studio', 'all')} {t(language, 'studio', 'rarity')}</option>
                  <option value="BRONZE">BRONZE</option>
                  <option value="SILVER">SILVER</option>
                  <option value="GOLD">GOLD</option>
                  <option value="PLATINUM">PLATINUM</option>
                </select>
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">{t(language, 'studio', 'all')} {t(language, 'studio', 'genre')}</option>
                  <option value="pop">Pop</option>
                  <option value="rock">Rock</option>
                  <option value="hip-hop">Hip-Hop</option>
                  <option value="electronic">Electronic</option>
                </select>
                <select
                  value={costFilter}
                  onChange={(e) => setCostFilter(e.target.value)}
                  className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">{t(language, 'studio', 'all')} {t(language, 'studio', 'cost')}</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredInventory.map((item) => {
                const inDeckCount = deck.cards[item.card.id] || 0;
                const canAdd = inDeckCount < 4 && inDeckCount < item.count && deckCardCount < 60;

                return (
                  <div key={item.card.id} className="relative group cursor-pointer" onClick={() => canAdd && addCardToDeck(deck.id, item.card)}>
                    <MiniCard data={item.card} className={`w-full transition-transform ${canAdd ? 'group-hover:scale-105' : 'opacity-50 grayscale'}`} />
                    <div className="absolute -bottom-2 -right-2 bg-black text-white border border-white/20 w-8 h-8 rounded-full flex flex-col items-center justify-center font-bold text-[10px] shadow-lg z-30">
                      <span>{inDeckCount}</span>
                      <span className="text-[8px] text-gray-400 -mt-1">/{item.count}</span>
                    </div>
                    {canAdd && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors z-20 flex items-center justify-center rounded-xl">
                        <Plus className="text-white opacity-0 group-hover:opacity-100 w-12 h-12 drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 relative">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{t(language, 'studio', 'title') || 'Estudio'}</h1>
            <p className="text-gray-400 text-sm">{t(language, 'studio', 'subtitle') || 'Tu colección y mazos (Deckbuilder)'}</p>
          </div>
          <button
            onClick={handleSync}
            className="px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={loadingLyrics ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{t(language, 'studio', 'syncMechanics')}</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('mazos')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'mazos' ? 'bg-white text-black' : 'bg-[#242424] text-white hover:bg-[#333]'}`}
          >
            {mounted ? (t(language, 'studio', 'decksTab', { count: decksList.length }) || `Mazos (${decksList.length})`) : 'Mazos (---)'}
          </button>
          <button
            onClick={() => setActiveTab('coleccion')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'coleccion' ? 'bg-white text-black' : 'bg-[#242424] text-white hover:bg-[#333]'}`}
          >
            {mounted ? (t(language, 'studio', 'collectionTab', { count: inventoryList.length }) || `Colección (${inventoryList.length})`) : 'Colección (---)'}
          </button>
          <button
            onClick={() => setActiveTab('descubrimientos')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'descubrimientos' ? 'bg-white text-black' : 'bg-[#242424] text-white hover:bg-[#333]'}`}
          >
            {t(language, 'nav', 'discoveries') || 'Descubrimientos'}
          </button>
        </div>
      </div>

      {/* Wildcards Display */}
      <div className="flex flex-col gap-4 bg-[#121212] p-4 rounded-xl border border-white/10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm">{t(language, 'studio', 'wildcards') || 'Tus Comodines'}</h2>
            <p className="text-xs text-gray-400">{t(language, 'studio', 'wildcardsDesc') || 'Muele 5 cartas de una rareza para obtener 1 comodín'}</p>
          </div>
          <button
            onClick={() => {
              const count = usePlayerStore.getState().millAllDuplicates();
              if (count > 0) {
                toast.success(t(language, 'studio', 'millDuplicatesSuccess', { count }));
              } else {
                toast.info(t(language, 'studio', 'noDuplicates') || 'No tienes cartas duplicadas (>4 copias).');
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} />
            {t(language, 'studio', 'millDuplicates')}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(wildcards).map(([rarity, count]) => {
            const progress = wildcardProgress?.[rarity as keyof typeof wildcards] || 0;
            const colors = {
              BRONZE: 'bg-[#cd7f32]',
              SILVER: 'bg-[#c0c0c0]',
              GOLD: 'bg-[#ffd700]',
              PLATINUM: 'bg-cyan-400'
            };
            const colorClass = colors[rarity as keyof typeof colors];

            return (
              <div key={rarity} className="flex flex-col items-center bg-[#242424] p-2 rounded-lg">
                <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">{rarity}</span>
                <span className={`font-bold text-lg ${colorClass.replace('bg-', 'text-')}`}>{count}</span>

                {/* Progress Bar */}
                <div className="w-full mt-2 flex gap-0.5 h-1.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full ${i < progress ? colorClass : 'bg-[#333]'}`}
                    />
                  ))}
                </div>
                <span className="text-[8px] text-gray-500 mt-1">{progress}/5</span>
              </div>
            );
          })}
        </div>
      </div>

      {activeTab === 'mazos' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
          <div
            onClick={() => setShowCreateModal(true)}
            className="bg-[#121212] border border-white/10 rounded-xl p-4 aspect-square flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#1a1a1a] transition-colors"
          >
            <div className="text-4xl mb-2">+</div>
            <p className="font-bold">{t(language, 'studio', 'createDeck') || 'Crear Mazo'}</p>
          </div>

          {decksList.map(deck => {
            const count = Object.values(deck.cards).reduce((a, b) => a + b, 0);
            return (
              <div
                key={deck.id}
                onClick={() => setEditingDeckId(deck.id)}
                className="bg-[#121212] border border-white/10 rounded-xl p-4 aspect-square flex flex-col justify-end relative overflow-hidden cursor-pointer group"
              >
                {deck.coverArt && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={deck.coverArt} alt={deck.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" crossOrigin="anonymous" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
                <div className="relative z-20 group-hover:scale-105 transition-transform w-full">
                  <div className="flex justify-between items-end w-full">
                    <div>
                      <p className="font-bold text-lg truncate">{deck.name}</p>
                      <p className="text-xs text-gray-300">{t(language, 'studio', 'cardsInDeck', { count }) || `${count}/60 cartas`}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(t(language, 'studio', 'deleteDeckConfirm') || '¿Eliminar mazo?')) deleteDeck(deck.id); }}
                      className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'coleccion' && (
        <div className="mt-2">
          {/* Filters in Collection Tab */}
          <div className="flex flex-col gap-4 mb-6 bg-[#121212] p-4 rounded-xl border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder={t(language, 'search', 'placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">{t(language, 'studio', 'all')} {t(language, 'studio', 'rarity')}</option>
                <option value="BRONZE">BRONZE</option>
                <option value="SILVER">SILVER</option>
                <option value="GOLD">GOLD</option>
                <option value="PLATINUM">PLATINUM</option>
              </select>
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">{t(language, 'studio', 'all')} {t(language, 'studio', 'genre')}</option>
                <option value="pop">Pop</option>
                <option value="rock">Rock</option>
                <option value="hip-hop">Hip-Hop</option>
                <option value="electronic">Electronic</option>
              </select>
              <select
                value={costFilter}
                onChange={(e) => setCostFilter(e.target.value)}
                className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">{t(language, 'studio', 'all')} {t(language, 'studio', 'cost')}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {inventoryList.length === 0 ? (
            <div className="text-center py-12 bg-[#121212] rounded-xl border border-white/10">
              <p className="text-gray-400 mb-4">{t(language, 'studio', 'emptyCollection') || 'Tu colección está vacía.'}</p>
              <p className="text-sm">{t(language, 'studio', 'emptyCollectionDesc') || 'Ve a la Tienda para abrir sobres o busca canciones en La Disquera.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredInventory.map((item) => (
                <div
                  key={item.card.id}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedCard(item.card)}
                >
                  <MiniCard data={item.card} className="w-full group-hover:scale-105 transition-transform" />
                  <div className="absolute -bottom-2 -right-2 bg-white text-black w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg z-30">
                    x{item.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'descubrimientos' && (
        <div className="mt-2">
          <DiscoveriesTab />
        </div>
      )}

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/10 p-6 rounded-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t(language, 'studio', 'newDeck') || 'Nuevo Mazo'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder={t(language, 'studio', 'deckName') || "Nombre del mazo"}
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-white/30"
              autoFocus
            />
            <button
              onClick={handleCreateDeck}
              disabled={!newDeckName.trim()}
              className="w-full py-3 rounded-full font-bold text-black bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t(language, 'studio', 'create') || 'Crear'}
            </button>
          </div>
        </div>
      )}

      {/* Card Details / Mill Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedCard(null)}>
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 max-w-5xl w-full animate-in fade-in zoom-in duration-200 py-8 lg:py-16 mx-auto" onClick={e => e.stopPropagation()}>

            {/* Left Col: Target Card and Actions */}
            <div className="flex flex-col items-center gap-6 w-full max-w-md shrink-0">
              <div className="relative group" id="share-card-container">
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

              {/* Wildcards for this rarity */}
              <div className="bg-[#121212]/80 backdrop-blur-md w-full p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedCard.rarity === 'BRONZE' ? 'bg-[#cd7f32]' :
                    selectedCard.rarity === 'SILVER' ? 'bg-[#c0c0c0]' :
                      selectedCard.rarity === 'GOLD' ? 'bg-[#ffd700]' : 'bg-cyan-400'
                    }`} />
                  <p className="text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                    {t(language, 'studio', 'wildcards')}: <span className="text-white ml-2">{wildcards[selectedCard.rarity] || 0}</span>
                  </p>
                </div>
                <p className="text-[10px] text-gray-500 italic hidden sm:block">1.5 Rules Active</p>
              </div>

              <div className="flex flex-wrap gap-4 w-full">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="flex-1 min-w-[100px] py-3 rounded-full font-bold text-white bg-[#242424] hover:bg-[#333] transition-colors"
                >
                  {t(language, 'studio', 'close') || 'Cerrar'}
                </button>
                <button
                  onClick={() => handleShare(selectedCard)}
                  className="flex-1 min-w-[100px] py-3 rounded-full font-bold text-black bg-blue-400 hover:bg-blue-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  <span>{t(language, 'studio', 'share') || 'Compartir'}</span>
                </button>
                <button
                  onClick={() => handleMillCard(selectedCard.id)}
                  className="flex-1 min-w-[100px] py-3 rounded-full font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  <span>{t(language, 'studio', 'mill') || 'Moler'}</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {t(language, 'studio', 'millWarning') || 'Moler esta carta la eliminará de tu colección y aumentará tu progreso para obtener un comodín de su rareza.'}
              </p>
            </div>

            {/* Right Col: Lyrics & Music Player SidePanel */}
            <div className="flex flex-col gap-6 w-full lg:max-w-md xl:max-w-lg shrink-0">
              {/* YouTube Player */}
              {selectedCard.videoId && (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selectedCard.videoId}`}
                    title={selectedCard.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              {/* Lyrics Section */}
              <div className="w-full p-4 bg-[#121212] border border-white/10 rounded-xl h-[300px] lg:h-[500px] flex flex-col">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2 shrink-0">
                  <Music size={12} />
                  {t(language, 'studio', 'lyrics')}
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {loadingLyrics ? (
                    <div className="flex gap-1 py-4 justify-center">
                      <div className="w-1 h-4 bg-white/20 animate-bounce" />
                      <div className="w-1 h-4 bg-white/20 animate-bounce delay-75" />
                      <div className="w-1 h-4 bg-white/20 animate-bounce delay-150" />
                    </div>
                  ) : lyrics ? (
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-serif italic pb-4">
                      {lyrics}
                    </p>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center italic">
                      No lyrics found
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
