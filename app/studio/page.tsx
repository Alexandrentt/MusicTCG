'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import Card from '@/components/cards/Card';
import MiniCard from '@/components/cards/MiniCard';
import { CardData } from '@/lib/engine/generator';
import { Trash2, Plus, Minus, X, Play, Share2, RefreshCw, Music, Search as SearchIcon, Filter, CheckCircle2 } from 'lucide-react';
import { shareCardAsImage } from '@/lib/share';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import useDebounce from '@/hooks/useDebounce';
import { generateCard } from '@/lib/engine/generator';
import { SearchResult } from '@/lib/search/searchEngine';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;


import DiscoveriesTab from '@/components/DiscoveriesTab';

import SearchCardResult from '@/components/discovery/SearchCardResult';

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<'mazos' | 'coleccion' | 'descubrimientos'>('coleccion');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[] | string | null>(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'artist' | 'song'>('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
  const debouncedGlobalQuery = useDebounce(globalSearchQuery, 300);


  const { playTrack } = useMusicPlayer();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K Shortcut
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Query Param Focus
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('focus') === 'true' || params.get('q')) {
        const query = params.get('q') || '';
        if (query) setGlobalSearchQuery(query);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 500);
      }
    }
  }, []);

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
    recalculateInventory,
    inspectingCard,
    setInspectingCard
  } = usePlayerStore();

  useEffect(() => {
    if (inspectingCard) {
      setSelectedCard(inspectingCard);
      setInspectingCard(null);
    }
  }, [inspectingCard, setInspectingCard]);

  useEffect(() => {
    if (selectedCard) {
      const fetchLyrics = async () => {
        setLoadingLyrics(true);
        setCurrentLyricIndex(-1);
        try {
          const res = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(selectedCard.artist)}&track_name=${encodeURIComponent(selectedCard.name)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.syncedLyrics) {
              const lines = data.syncedLyrics.split('\n');
              const parsed = lines.map((line: string) => {
                const match = line.match(/\[(\d{2}):(\d{2}\.\d{2,3})\]/);
                if (match) {
                  const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
                  const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/, '').trim();
                  return { time, text };
                }
                return null;
              }).filter(Boolean) as { time: number; text: string }[];
              setLyrics(parsed);
              return;
            } else if (data.plainLyrics) {
              setLyrics(data.plainLyrics);
              return;
            }
          }
        } catch (e) {
          setLyrics(null);
        } finally {
          setLoadingLyrics(false);
        }
      };
      fetchLyrics();
    } else {
      setLyrics(null);
      setCurrentLyricIndex(-1);
    }
  }, [selectedCard]);



  useEffect(() => {
    setMounted(true);
  }, []);

  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [costFilter, setCostFilter] = useState<string>('all');
  const [cardToMill, setCardToMill] = useState<CardData | null>(null);

  const inventoryList = useMemo(() => Object.values(inventory), [inventory]);
  const decksList = useMemo(() => Object.values(decks), [decks]);

  // Unified Filtered Inventory (Your Collection)
  const filteredInventory = useMemo(() => {
    return inventoryList
      .filter((item) => {
        const query = globalSearchQuery.toLowerCase();
        const matchesSearch =
          item.card.name.toLowerCase().includes(query) ||
          item.card.artist.toLowerCase().includes(query);
        const matchesRarity = rarityFilter === 'all' || item.card.rarity === rarityFilter;
        const matchesGenre = genreFilter === 'all' || item.card.genre.toLowerCase() === genreFilter.toLowerCase();
        const matchesCost = costFilter === 'all' || item.card.cost === parseInt(costFilter);
        return matchesSearch && matchesRarity && matchesGenre && matchesCost;
      })
      // Más reciente primero
      .sort((a, b) => (b.obtainedAt ?? 0) - (a.obtainedAt ?? 0));
  }, [inventoryList, globalSearchQuery, rarityFilter, genreFilter, costFilter]);

  // Handle Search (Global API)
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedGlobalQuery) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const queryTerm = debouncedGlobalQuery.trim().replace(/\s+/g, '+');
        const attribute = searchFilter === 'artist' ? '&attribute=artistTerm' :
          searchFilter === 'song' ? '&attribute=songTerm' : '';
        const response = await fetch(
          `https://itunes.apple.com/search?term=${queryTerm}&entity=song&limit=40${attribute}`
        );

        const data = await response.json();

        const results: SearchResult[] = (data.results || []).map((track: any) => {
          // Check if we own this track already to "mark it"
          const ownedItem = inventoryList.find(
            item =>
              item.card.name.toLowerCase() === track.trackName.toLowerCase() &&
              item.card.artist.toLowerCase() === track.artistName.toLowerCase()
          );

          if (ownedItem) {
            return {
              id: ownedItem.card.id,
              trackId: track.trackId.toString(),
              name: track.trackName,
              artist: track.artistName,
              album: track.collectionName,
              genre: track.primaryGenreName,
              artworkUrl: track.artworkUrl100.replace('100x100', '600x600'),
              matchScore: 1,
              matchType: 'EXACT',
              cardData: ownedItem.card,
              rarity: ownedItem.card.rarity
            };
          }

          // Not owned, generate a virtual preview card
          const virtualCard = generateCard({
            trackId: track.trackId?.toString() || String(Math.random()),
            trackName: track.trackName,
            artistName: track.artistName,
            collectionName: track.collectionName,
            primaryGenreName: track.primaryGenreName,
            artworkUrl100: track.artworkUrl100 || '',
            previewUrl: track.previewUrl || ''
          });

          return {
            id: track.trackId.toString(),
            trackId: track.trackId.toString(),
            name: track.trackName,
            artist: track.artistName,
            album: track.collectionName,
            genre: track.primaryGenreName,
            artworkUrl: track.artworkUrl100.replace('100x100', '600x600'),
            matchScore: 0.8,
            matchType: 'PARTIAL',
            cardData: virtualCard,
            rarity: virtualCard.rarity
          };
        });

        // Sort: Owned first
        const sortedResults = [...results].sort((a, b) => {
          const aOwned = !!inventoryList.find(i => i.card.name === a.name && i.card.artist === a.artist);
          const bOwned = !!inventoryList.find(i => i.card.name === b.name && i.card.artist === b.artist);
          if (aOwned && !bOwned) return -1;
          if (!aOwned && bOwned) return 1;
          return 0;
        });

        setSearchResults(sortedResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedGlobalQuery, inventoryList]);


  const handleCreateDeck = () => {
    if (newDeckName.trim()) {
      createDeck(newDeckName.trim());
      setNewDeckName('');
      setShowCreateModal(false);
    }
  };

  const handleMillCard = (card: CardData) => {
    setCardToMill(card);
  };


  const confirmMillCard = () => {
    if (cardToMill) {
      // Find the master card ID to ensure we mill the correct inventory item
      const existingMaster = Object.values(inventory).find(
        item =>
          item.card.name.toLowerCase() === cardToMill.name.toLowerCase() &&
          item.card.artist.toLowerCase() === cardToMill.artist.toLowerCase()
      );

      const targetCardId = existingMaster ? existingMaster.card.id : cardToMill.id;
      const success = millCard(targetCardId);

      if (success) {
        setSelectedCard(null);
        setCardToMill(null);
        toast.success(t(language, 'studio', 'millSuccess') || 'Carta molida correctamente.');
      } else {
        toast.error('No se pudo moler la carta.');
        setCardToMill(null);
      }
    }
  };

  const handlePlayPreview = (card: CardData) => {
    if (card.previewUrl) {
      playTrack({
        id: card.id,
        url: card.previewUrl,
        title: card.name,
        artist: card.artist,
        artworkUrl: card.artworkUrl
      } as any);
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

    // Energy Curve Calculation
    const energyCurve = Array(9).fill(0); // 0 to 8+
    Object.entries(deck.cards).forEach(([cardId, count]) => {
      const card = inventory[cardId]?.card;
      if (card) {
        const cost = Math.min(card.cost, 8);
        energyCurve[cost] += count;
      }
    });
    const maxEnergyCount = Math.max(...energyCurve, 1);

    const renderEnergyCurve = () => (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-5 mb-4 shadow-inner">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500/50">Curva de Estrategia</h3>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-cyan-500/20" />
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between h-32 gap-1.5 px-1">
          {energyCurve.map((count, cost) => (
            <div key={cost} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex flex-col items-center justify-end h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(count / maxEnergyCount) * 100}%` }}
                  className={`w-full rounded-t-lg transition-all duration-500 relative overflow-hidden ${count > 0
                    ? 'bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-white/5'
                    }`}
                >
                  {count > 0 && (
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  )}
                </motion.div>
                {count > 0 && (
                  <span className="absolute -top-6 text-[10px] font-black text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </span>
                )}
              </div>
              <div className="text-[10px] font-black text-gray-500 mt-3 tabular-nums">{cost === 8 ? '8+' : cost}</div>
            </div>
          ))}
        </div>
      </div>
    );



    return (
      <div className="flex flex-col gap-6 min-h-screen pb-24">
        <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-white/10 flex items-center justify-between mb-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg`}>
              <Music className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase">{deck.name}</h1>
              <div className="flex items-center gap-2">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{t(language, 'studio', 'cardsInDeck', { count: deckCardCount }) || `${deckCardCount}/60 cartas`}</p>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <p className={`text-[10px] font-black uppercase tracking-widest ${deckCardCount >= 40 ? 'text-green-400' : 'text-amber-400'}`}>
                  {deckCardCount < 40 ? 'NO LEGAL' : 'LEGAL'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditingDeckId(null)}
            className="px-8 py-2.5 bg-white text-black rounded-full text-xs font-black uppercase tracking-tighter hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
          >
            {t(language, 'studio', 'back') || 'Guardar y Salir'}
          </button>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
          {/* Deck Contents */}
          <div className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-28 h-max z-10">
            {renderEnergyCurve()}

            <div className="bg-[#121212] rounded-2xl border border-white/10 p-4 h-[50vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  {t(language, 'studio', 'cardsInDeckTitle') || 'Contenido del Mazo'}
                </h2>
                <span className="text-[10px] font-black text-white/40">{deckCardCount}/60</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">

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
            </div>
          </div>

          {/* Collection to Add */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-4 mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{t(language, 'studio', 'yourCollection') || 'Tu Colección'}</h2>

              {/* Minimal Filters in Deck Editor */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="bg-[#121212] border border-white/10 rounded-full px-4 py-1.5 text-[10px] font-black uppercase focus:outline-none hover:border-cyan-500/50 transition-colors"
                >
                  <option value="all">RAREZA: TODAS</option>
                  <option value="BRONZE">BRONZE</option>
                  <option value="SILVER">SILVER</option>
                  <option value="GOLD">GOLD</option>
                  <option value="PLATINUM">PLATINUM</option>
                </select>
                <select
                  value={costFilter}
                  onChange={(e) => setCostFilter(e.target.value)}
                  className="bg-[#121212] border border-white/10 rounded-full px-4 py-1.5 text-[10px] font-black uppercase focus:outline-none hover:border-cyan-500/50 transition-colors"
                >
                  <option value="all">COSTE: TODOS</option>
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
                    <MiniCard
                      data={item.card}
                      className={`w-full transition-transform ${canAdd ? 'group-hover:scale-105' : 'opacity-50 grayscale'}`}
                      onArtistClick={(artist) => {
                        setGlobalSearchQuery(artist);
                        setSearchFilter('artist');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
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
            <h1 className="text-3xl font-black tracking-tight">{t(language, 'studio', 'title') || 'Estudio'}</h1>
            <p className="text-gray-400 text-xs tracking-widest uppercase">{t(language, 'studio', 'subtitle') || 'Tu colección y mazos (Deckbuilder)'}</p>
          </div>

        </div>

        {/* UNIFIED SEARCH BAR - LA DISQUERA INTEGRADA */}
        <div className="relative group">
          <div className={`relative flex items-center transition-all duration-300 ${globalSearchQuery ? 'bg-white/10 ring-2 ring-cyan-500/50' : 'bg-white/5'} hover:bg-white/10 border border-white/10 rounded-2xl overflow-hidden`}>
            <SearchIcon className={`absolute left-4 w-5 h-5 transition-colors ${globalSearchQuery ? 'text-cyan-400' : 'text-white/20'}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Busca cualquier canción del mundo para ver si la tienes..."
              className="w-full pl-12 pr-12 py-4 bg-transparent text-white text-lg placeholder:text-white/20 focus:outline-none font-medium"
            />
            {globalSearchQuery && (
              <button
                onClick={() => setGlobalSearchQuery('')}
                className="absolute right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-12">
                <RefreshCw size={16} className="text-cyan-400 animate-spin" />
              </div>
            )}
          </div>

          {globalSearchQuery && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <button
                onClick={() => setSearchFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${searchFilter === 'all' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                Todo
              </button>
              <button
                onClick={() => setSearchFilter('artist')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${searchFilter === 'artist' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                Artistas
              </button>
              <button
                onClick={() => setSearchFilter('song')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${searchFilter === 'song' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                Canciones
              </button>
            </div>
          )}
        </div>

        {!globalSearchQuery && (
          <div className="flex gap-2 overflow-x-auto pb-1 animate-in fade-in slide-in-from-top-2 duration-300">
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
        )}
      </div>

      {globalSearchQuery ? (
        <div className="mt-4 space-y-12 animate-in fade-in zoom-in-95 duration-300">
          {/* RESULTS: OWNED */}
          {(() => {
            const ownedInSearch = searchResults.filter(r => inventory[r.id]);
            if (ownedInSearch.length === 0) return null;
            return (
              <section>
                <div className="flex items-center gap-2 mb-6 px-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">✓ Lo que tienes</h3>
                  <span className="text-xs font-bold text-green-500/50 bg-green-500/10 px-2 py-0.5 rounded ml-2">
                    {ownedInSearch.length} resultados
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {ownedInSearch.map(result => (
                    <SearchCardResult
                      key={result.id}
                      result={result}
                      isSelected={false}
                      isOwned={true}
                      className="hover:scale-105 transition-transform"
                      onClick={() => {
                        if (result.cardData) {
                          setSelectedCard(result.cardData);
                        }
                      }}
                      onArtistClick={(artist) => {
                        setGlobalSearchQuery(artist);
                        setSearchFilter('artist');
                        setSelectedCard(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  ))}

                </div>
              </section>
            );
          })()}

          {/* DIVIDER */}
          {searchResults.some(r => inventory[r.id]) && searchResults.some(r => !inventory[r.id]) && (
            <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          )}

          {/* RESULTS: NOT OWNED */}
          {(() => {
            const notOwnedInSearch = searchResults.filter(r => !inventory[r.id]);
            if (notOwnedInSearch.length === 0 && !isSearching) return (
              <div className="text-center py-20 opacity-40 italic">No hay más variaciones detectadas...</div>
            );
            return (
              <section className="opacity-60 grayscale-[0.3] hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                <div className="flex items-center gap-2 mb-6 px-2">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <SearchIcon className="w-4 h-4 text-white/40" />
                  </div>
                  <h3 className="text-xl font-black text-white/50 uppercase tracking-tight">○ Otros resultados</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {notOwnedInSearch.map(result => (
                    <SearchCardResult
                      key={result.id}
                      result={result}
                      isSelected={false}
                      isOwned={false}
                      className="hover:scale-105 transition-transform"
                      onClick={() => result.cardData && setSelectedCard(result.cardData)}
                      onArtistClick={(artist) => {
                        setGlobalSearchQuery(artist);
                        setSearchFilter('artist');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })()}

          {searchResults.length === 0 && !isSearching && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
              <Music className="w-16 h-16 mb-4" />
              <p className="font-bold">Busca cualquier canción para contratarla o ver si es parte de tu colección.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in duration-500 flex flex-col gap-6">
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
                const colors: Record<string, string> = {
                  BRONZE: 'bg-[#cd7f32]',
                  SILVER: 'bg-[#c0c0c0]',
                  GOLD: 'bg-[#ffd700]',
                  PLATINUM: 'bg-cyan-400',
                  MYTHIC: 'bg-purple-500'
                };
                const colorClass = colors[rarity] || 'bg-gray-500';

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
                      <MiniCard
                        data={item.card}
                        count={item.count}
                        className="w-full group-hover:scale-105 transition-transform"
                        onArtistClick={(artist) => {
                          setGlobalSearchQuery(artist);
                          setSearchFilter('artist');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />

                      {/* Studio Counter (Diamonds) - Estética Pro */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-1 z-30 drop-shadow-md">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={false}
                            animate={{
                              scale: i < item.count ? [1, 1.2, 1] : 1,
                              rotate: 45
                            }}
                            className={`w-2 h-2 border border-white/30 transition-all ${i < item.count
                              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.6)] border-white/50'
                              : 'bg-black/80 opacity-40'
                              }`}
                          />
                        ))}
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
              {(() => {
                const ownedMasterCard = Object.values(inventory).find(
                  item =>
                    item.card.name.toLowerCase() === selectedCard.name.toLowerCase() &&
                    item.card.artist.toLowerCase() === selectedCard.artist.toLowerCase()
                );
                return (
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 max-w-5xl w-full animate-in fade-in zoom-in duration-200 py-8 lg:py-16 mx-auto" onClick={e => e.stopPropagation()}>

                    {/* Left Col: Target Card and Actions */}
                    <div className="flex flex-col items-center gap-6 w-full max-w-md shrink-0">
                      <div className="relative group" id="share-card-container">
                        <Card
                          data={selectedCard}
                          className="w-72 sm:w-80"
                          onArtistClick={(artist) => {
                            setGlobalSearchQuery(artist);
                            setSearchFilter('artist');
                            setSelectedCard(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                        {selectedCard.previewUrl && (
                          <button
                            onClick={() => {
                              handlePlayPreview(selectedCard);
                              setIsPlayerPlaying(!isPlayerPlaying);
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded-xl"
                          >
                            <div className={`w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all transform ${isPlayerPlaying ? 'opacity-0 scale-90 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:scale-110'}`}>
                              {isPlayerPlaying ? (
                                <div className="flex gap-1.5 items-center">
                                  <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" />
                                  <div className="w-1.5 h-6 bg-white rounded-full animate-pulse delay-75" />
                                </div>
                              ) : (
                                <Play size={32} className="text-white ml-1" fill="currentColor" />
                              )}
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
                        {ownedMasterCard && (
                          <div className="flex flex-col gap-4 w-full">
                            <button
                              onClick={() => handleMillCard(selectedCard)}
                              className="w-full py-3 rounded-full font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Trash2 size={18} />
                              <span>{t(language, 'studio', 'mill') || 'Moler'}</span>
                            </button>
                            <p className="text-xs text-gray-400 text-center">
                              {t(language, 'studio', 'millWarning') || 'Moler esta carta la eliminará de tu colección y aumentará tu progreso para obtener un comodín de su rareza.'}
                            </p>
                          </div>
                        )}
                        {!ownedMasterCard && (
                          <div className="w-full bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl text-center">
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">CARTA NO POSEÍDA</p>
                            <p className="text-gray-400 text-[10px]">Busca esta carta en sobres o canjéala con comodines para añadirla a tu colección.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Col: Lyrics & Music Player SidePanel */}
                    {(selectedCard.videoId || lyrics) && (
                      <div className="flex flex-col gap-6 w-full lg:max-w-md xl:max-w-lg shrink-0">
                        {/* YouTube Player */}
                        {selectedCard.videoId && (
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl relative group/player">
                            <ReactPlayer
                              url={`https://www.youtube.com/watch?v=${selectedCard.videoId}`}
                              width="100%"
                              height="100%"
                              playing={isPlayerPlaying}
                              controls
                              onPlay={() => setIsPlayerPlaying(true)}
                              onPause={() => setIsPlayerPlaying(false)}
                              onProgress={(progress: any) => {
                                const playedSeconds = progress.playedSeconds;
                                if (Array.isArray(lyrics)) {
                                  const index = lyrics.findIndex((line, i) => {
                                    const nextLine = lyrics[i + 1];
                                    return playedSeconds >= line.time && (!nextLine || playedSeconds < nextLine.time);
                                  });
                                  if (index !== -1 && index !== currentLyricIndex) {
                                    setCurrentLyricIndex(index);
                                    // Scroll to active lyric
                                    const el = document.getElementById(`lyric-${index}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }
                                }
                              }}
                            />

                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none opacity-0 group-hover/player:opacity-100 transition-opacity" />
                          </div>
                        )}

                        {/* Lyrics Section — solo se oculta en error real */}
                        {(loadingLyrics || lyrics) && (

                          <div className="w-full p-6 bg-[#121212] border border-white/10 rounded-2xl h-[300px] lg:h-[500px] flex flex-col shadow-inner">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 flex items-center gap-2 shrink-0">
                              <Music size={12} className="text-cyan-500" />
                              {t(language, 'studio', 'lyrics')}
                            </h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 relative">
                              {loadingLyrics ? (
                                <div className="flex gap-1 py-8 justify-center">
                                  <div className="w-1 h-6 bg-cyan-500/40 animate-bounce" />
                                  <div className="w-1 h-6 bg-cyan-500/40 animate-bounce delay-75" />
                                  <div className="w-1 h-6 bg-cyan-500/40 animate-bounce delay-150" />
                                </div>
                              ) : Array.isArray(lyrics) ? (
                                <div className="flex flex-col gap-4 pb-12">
                                  {lyrics.map((line, i) => (
                                    <p
                                      key={i}
                                      id={`lyric-${i}`}
                                      className={`text-base leading-relaxed whitespace-pre-wrap font-serif italic transition-all duration-500 ${i === currentLyricIndex
                                        ? 'text-white font-bold scale-110 origin-left drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                                        : i < currentLyricIndex
                                          ? 'text-white/20 blur-[0.5px]'
                                          : 'text-white/40'
                                        }`}
                                    >
                                      {line.text || '♪'}
                                    </p>
                                  ))}
                                </div>
                              ) : typeof lyrics === 'string' && lyrics.length > 0 ? (
                                <p className="text-base text-gray-300 leading-relaxed whitespace-pre-wrap font-serif italic pb-8 opacity-80">
                                  {lyrics}
                                </p>
                              ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 text-xs text-center italic">
                                  No se encontraron letras para esta canción.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Mill Confirmation Modal */}
      {cardToMill && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setCardToMill(null)}>
          <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">{t(language, 'studio', 'Moler') || '¿Moler carta?'}</h3>
            <p className="text-gray-400 text-sm mb-6">
              {t(language, 'studio', 'millConfirm') || '¿Estás seguro de que quieres moler esta carta? Obtendrás progreso para un comodín de su rareza.'}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setCardToMill(null)}
                className="flex-1 py-3 rounded-full font-bold text-white bg-[#242424] hover:bg-[#333] transition-colors"
              >
                {t(language, 'studio', 'cancel') || 'Cancelar'}
              </button>
              <button
                onClick={confirmMillCard}
                className="flex-1 py-3 rounded-full font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                {t(language, 'studio', 'mill') || 'Moler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
