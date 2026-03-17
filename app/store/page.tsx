'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import { Loader2, Sparkles, Info, Eye, ChevronRight, Music, Star } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import Image from 'next/image';
import { logDiscovery } from '@/lib/discovery';
import { auth } from '@/lib/firebase';
import Pack from '@/components/store/Pack';
import CardBack from '@/components/cards/CardBack';

interface PackType {
  id: string;
  nameKey: string;
  descKey: string;
  cost: number;
  color: string;
  terms: string[];
  previewTracks: { name: string; artist: string; art: string }[];
}

const PACK_TYPES: PackType[] = [
  {
    id: 'basic',
    nameKey: 'basicPack',
    descKey: 'basicDesc',
    cost: 100,
    color: 'from-gray-700 to-black',
    terms: ['hits', 'top', 'music', 'popular'],
    previewTracks: [
      { name: 'Blinding Lights', artist: 'The Weeknd', art: 'https://picsum.photos/seed/blinding/500/500' },
      { name: 'Shape of You', artist: 'Ed Sheeran', art: 'https://picsum.photos/seed/shape/500/500' }
    ]
  },
  {
    id: 'pop',
    nameKey: 'popPack',
    descKey: 'popDesc',
    cost: 250,
    color: 'from-pink-900 to-black',
    terms: ['pop', 'r&b', 'soul'],
    previewTracks: [
      { name: 'Flowers', artist: 'Miley Cyrus', art: 'https://picsum.photos/seed/flowers/500/500' },
      { name: 'Anti-Hero', artist: 'Taylor Swift', art: 'https://picsum.photos/seed/antihero/500/500' }
    ]
  },
  {
    id: 'rock',
    nameKey: 'rockPack',
    descKey: 'rockDesc',
    cost: 250,
    color: 'from-red-900 to-black',
    terms: ['rock', 'metal', 'punk', 'grunge'],
    previewTracks: [
      { name: 'Smells Like Teen Spirit', artist: 'Nirvana', art: 'https://picsum.photos/seed/nirvana/500/500' },
      { name: 'Master of Puppets', artist: 'Metallica', art: 'https://picsum.photos/seed/metallica/500/500' }
    ]
  },
  {
    id: 'electronic',
    nameKey: 'electronicPack',
    descKey: 'electronicDesc',
    cost: 250,
    color: 'from-cyan-900 to-black',
    terms: ['electronic', 'dance', 'house', 'techno'],
    previewTracks: [
      { name: 'One More Time', artist: 'Daft Punk', art: 'https://picsum.photos/seed/daft/500/500' },
      { name: 'Levels', artist: 'Avicii', art: 'https://picsum.photos/seed/avicii/500/500' }
    ]
  },
  {
    id: 'legends',
    nameKey: 'legendsPack',
    descKey: 'legendsDesc',
    cost: 600,
    color: 'from-yellow-900 to-black',
    terms: ['classic', 'legend', 'greatest hits', 'iconic'],
    previewTracks: [
      { name: 'Bohemian Rhapsody', artist: 'Queen', art: 'https://picsum.photos/seed/queen/500/500' },
      { name: 'Thriller', artist: 'Michael Jackson', art: 'https://picsum.photos/seed/mj/500/500' }
    ]
  }
];

export default function StorePage() {
  const { regalias, spendRegalias, addCard, language, pityCounters, incrementPity, resetPity } = usePlayerStore();
  const [mounted, setMounted] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openedCards, setOpenedCards] = useState<{ card: CardData; isDuplicate: boolean; revealed: boolean }[]>([]);
  const [revealingAll, setRevealingAll] = useState(false);
  const [packOpeningState, setPackOpeningState] = useState<'idle' | 'showingPack' | 'showingCards'>('idle');
  const [currentPack, setCurrentPack] = useState<PackType | null>(null);

  const particles = useMemo(() => [...Array(50)].map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    scale: Math.random() * 2 + 1,
  })), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBuyPack = async (pack: PackType, quantity: number = 1) => {
    const totalCost = pack.cost * quantity;
    if (regalias < totalCost) {
      toast.error(t(language, 'store', 'notEnoughRegalias'));
      return;
    }

    setLoading(true);
    try {
      const term = pack.terms[Math.floor(Math.random() * pack.terms.length)];
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=${20 * quantity}`);
      const data = await res.json();

      if (!data.results || data.results.length === 0) throw new Error('No results');

      const shuffled = data.results.sort(() => 0.5 - Math.random());
      const selectedTracks = shuffled.slice(0, 5 * quantity);

      const newCards: CardData[] = [];

      for (let i = 0; i < selectedTracks.length; i++) {
        const track = selectedTracks[i];
        let forcedRarity: CardData['rarity'] | undefined;

        // Legends pack guarantees 1 Gold+
        if (pack.id === 'legends' && i === selectedTracks.length - 1) {
          forcedRarity = Math.random() > 0.8 ? 'PLATINUM' : 'GOLD';
        }

        // Pity logic
        const currentPity = usePlayerStore.getState().pityCounters;
        if (currentPity.PLATINUM >= 40) {
          forcedRarity = 'PLATINUM';
          resetPity('PLATINUM');
        } else if (currentPity.GOLD >= 10 && !forcedRarity) {
          forcedRarity = 'GOLD';
          resetPity('GOLD');
        }

        const card = generateCard(track, forcedRarity);

        // Update pity
        if (card.rarity === 'PLATINUM') {
          resetPity('PLATINUM');
          resetPity('GOLD');
        } else if (card.rarity === 'GOLD') {
          resetPity('GOLD');
          incrementPity('PLATINUM');
        } else {
          incrementPity('GOLD');
          incrementPity('PLATINUM');
        }

        newCards.push(card);
        // Log discovery to global database
        const playerName = usePlayerStore.getState().discoveryUsername || auth.currentUser?.displayName || (usePlayerStore.getState().language === 'es' ? 'Un Jugador' : 'A Player');
        logDiscovery(card, playerName);
      }

      if (spendRegalias(totalCost)) {
        const results = newCards.map((card: CardData) => {
          const res = addCard(card);
          // Rarest cards are sorted last and hidden
          return { card, isDuplicate: res.convertedToWildcard, revealed: false };
        });

        // Sort by rarity: BRONZE, SILVER, GOLD, PLATINUM
        const rarityOrder = { BRONZE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3 };
        results.sort((a, b) => rarityOrder[a.card.rarity] - rarityOrder[b.card.rarity]);

        setOpenedCards(results);
        setCurrentPack(pack);
        setIsOpening(true);
        setPackOpeningState('showingPack');
        setRevealingAll(false);
      }
    } catch (error) {
      console.error('Error opening pack:', error);
      toast.error(t(language, 'store', 'errorOpening'));
    } finally {
      setLoading(false);
    }
  };

  const revealCard = (index: number) => {
    setOpenedCards(prev => prev.map((c, i) => i === index ? { ...c, revealed: true } : c));
  };

  const revealAll = async () => {
    if (revealingAll) return;
    setRevealingAll(true);

    for (let i = 0; i < openedCards.length; i++) {
      if (!openedCards[i].revealed) {
        setOpenedCards(prev => prev.map((c, idx) => idx === i ? { ...c, revealed: true } : c));
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const closeOpening = () => {
    setIsOpening(false);
    setOpenedCards([]);
    setPackOpeningState('idle');
    setCurrentPack(null);
  };

  return (
    <div className="flex flex-col gap-6 relative min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5 flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t(language, 'nav', 'store')}</h1>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-lg">{mounted ? regalias.toLocaleString() : '---'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pity Info Card */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="bg-yellow-500/20 p-3 rounded-xl">
            <Info className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Pity System</p>
            <p className="text-sm text-gray-200">
              {mounted ? t(language, 'store', 'pityCounter', { count: 10 - pityCounters.GOLD, rarity: 'GOLD' }) : '---'}
            </p>
            <p className="text-xs text-gray-500">
              {mounted ? t(language, 'store', 'pityCounter', { count: 40 - pityCounters.PLATINUM, rarity: 'PLATINUM' }) : '---'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ChevronRight className="w-5 h-5 text-purple-500" />
          {t(language, 'store', 'featuredPacks')}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PACK_TYPES.map((pack) => (
            <div
              key={pack.id}
              className={`bg-gradient-to-br ${pack.color} p-6 rounded-3xl border border-white/10 relative overflow-hidden group flex flex-col sm:flex-row gap-6`}
            >
              <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors"></div>

              <div className="relative z-10 flex flex-col items-center sm:items-start">
                <Pack
                  type={pack.id.toUpperCase() as any}
                  className="mb-4 sm:mb-0 scale-75 sm:scale-100 origin-top sm:origin-left"
                  onClick={() => handleBuyPack(pack, 1)}
                />
              </div>

              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <h3 className="text-2xl font-bold">{t(language, 'store', pack.nameKey)}</h3>
                </div>
                <p className="text-sm text-gray-300 mb-6">{t(language, 'store', pack.descKey)}</p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  <button
                    onClick={() => handleBuyPack(pack, 1)}
                    disabled={loading || regalias < pack.cost}
                    className="bg-white text-black font-bold py-3 px-6 sm:px-8 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {pack.cost}
                  </button>
                  <button
                    onClick={() => handleBuyPack(pack, 5)}
                    disabled={loading || regalias < pack.cost * 5}
                    className="bg-black/40 backdrop-blur-sm text-white font-bold py-3 px-4 sm:px-6 rounded-2xl border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all shrink-0 whitespace-nowrap"
                  >
                    x5 ({(pack.cost * 5).toLocaleString()})
                  </button>
                </div>
              </div>

              <div className="relative z-10 w-full sm:w-40 flex flex-col gap-2">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                  {t(language, 'store', 'possibleCards')}
                </p>
                <div className="flex sm:flex-col gap-2">
                  {pack.previewTracks.map((track, i) => (
                    <div key={i} className="flex-1 sm:w-full aspect-square relative rounded-xl overflow-hidden border border-white/20 shadow-lg group-hover:scale-105 transition-transform duration-500" style={{ transitionDelay: `${i * 100}ms` }}>
                      <Image
                        src={track.art}
                        alt={track.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex flex-col justify-end">
                        <p className="text-[8px] font-bold truncate">{track.name}</p>
                        <p className="text-[6px] text-gray-400 truncate">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pack Opening Animation Overlay */}
      <AnimatePresence>
        {isOpening && openedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/98 backdrop-blur-xl overflow-hidden"
          >
            {/* Background Particles - Static to prevent window resizing */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute w-1 h-1 bg-white/10 rounded-full blur-[1px]"
                  style={{
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    transform: `scale(${p.scale})`
                  }}
                />
              ))}
            </div>

            <div className="max-w-[100vw] w-full flex flex-col items-center relative z-10 h-full justify-center">
              {packOpeningState === 'showingPack' ? (
                <div className="flex flex-col items-center gap-8">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                    className="relative cursor-pointer group"
                    onClick={() => setPackOpeningState('showingCards')}
                  >
                    <div className="absolute -inset-8 bg-white/20 blur-3xl rounded-full group-hover:bg-white/30 transition-all duration-500 animate-pulse" />
                    <Pack
                      type={currentPack?.id.toUpperCase() as any}
                      className="scale-150 relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    />
                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap text-white font-black text-xl italic uppercase tracking-tighter"
                    >
                      {t(language, 'store', 'tapToOpen') || 'Toca para abrir'}
                    </motion.div>
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <motion.h2
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-4xl font-black text-white mb-2 tracking-tighter italic uppercase"
                    >
                      {t(language, 'nav', 'store')}
                    </motion.h2>
                    <p className="text-gray-400 text-sm">{t(language, 'store', 'tapToReveal')}</p>
                  </div>

                  <div className="flex-1 w-full overflow-y-auto px-4 py-8 scrollbar-thin scrollbar-thumb-white/20 flex flex-col items-center">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-8 justify-items-center max-w-6xl w-full">
                      {openedCards.map((item, i) => {
                        const isRare = item.card.rarity === 'GOLD' || item.card.rarity === 'PLATINUM';

                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotateY: 180, opacity: 0, y: 100 }}
                            animate={{
                              scale: 1,
                              rotateY: item.revealed ? 0 : 180,
                              opacity: 1,
                              y: 0
                            }}
                            transition={{
                              delay: i * 0.05,
                              rotateY: { duration: 0.6, type: "spring", stiffness: 260, damping: 20 }
                            }}
                            onClick={() => !item.revealed && revealCard(i)}
                            className="relative cursor-pointer perspective-1000 group shrink-0 snap-center"
                          >
                            <div className={`relative w-40 sm:w-56 aspect-[2.5/3.5] preserve-3d transition-all duration-500 ${item.revealed ? '' : 'hover:scale-105'}`}>
                              {/* Card Back */}
                              <div className="absolute inset-0 backface-hidden rotate-y-180">
                                <CardBack className="w-full h-full" isRare={isRare} />
                              </div>

                              {/* Card Front */}
                              <div className="absolute inset-0 backface-hidden">
                                <Card data={item.card} className="w-full h-full" />
                                {item.isDuplicate && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-3 -right-3 bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-black z-10 animate-bounce"
                                  >
                                    {t(language, 'home', 'duplicate')}
                                  </motion.div>
                                )}
                                {isRare && (
                                  <motion.div
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -inset-1 border-2 border-amber-400/50 rounded-xl blur-sm pointer-events-none"
                                  />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-md">
                      {!revealingAll && openedCards.some(c => !c.revealed) && (
                        <button
                          onClick={revealAll}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          {t(language, 'store', 'revealAll')}
                        </button>
                      )}

                      {(revealingAll || openedCards.every(c => c.revealed)) && (
                        <motion.button
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          onClick={closeOpening}
                          className="flex-1 bg-white text-black font-black py-4 px-12 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] uppercase tracking-tighter italic"
                        >
                          {t(language, 'home', 'finish')}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
