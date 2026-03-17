'use client';

import Link from 'next/link';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useEffect, useState } from 'react';
import { Gift, CheckCircle, Loader2, Play, Star } from 'lucide-react';
import { toast } from 'sonner';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '@/lib/i18n';
import { getRecentDiscoveries, logDiscovery, getGlobalStats } from '@/lib/discovery';
import { Globe, Music, Sparkles, BarChart3, TrendingUp, Users, Eye } from 'lucide-react';
import { auth } from '@/lib/firebase';
import Pack from '@/components/store/Pack';

export default function Home() {
  const { 
    freePacksCount, 
    checkHourlyPacks, 
    consumeFreePack, 
    dailyMissions, 
    checkDailyMissions, 
    claimMissionReward,
    addCards,
    language,
    discoveryUsername,
    regalias,
    inventory
  } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openedCards, setOpenedCards] = useState<{ card: CardData; isDuplicate: boolean }[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [recentDiscoveries, setRecentDiscoveries] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    checkHourlyPacks();
    checkDailyMissions();
    
    // Fetch recent discoveries and stats
    getRecentDiscoveries(5).then(setRecentDiscoveries);
    getGlobalStats().then(setGlobalStats);

    if (!usePlayerStore.getState().hasReceivedInitialPacks) {
      usePlayerStore.setState((state) => ({
        freePacksCount: state.freePacksCount + 8,
        hasReceivedInitialPacks: true
      }));
      toast.success(t(language, 'home', 'welcomePacks') || '¡Bienvenido! Has recibido 8 sobres iniciales.');
    }

    const interval = setInterval(() => {
      checkHourlyPacks();
      checkDailyMissions();
      getRecentDiscoveries(5).then(setRecentDiscoveries);
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkHourlyPacks, checkDailyMissions, language]);

  const handleOpenFreePacks = async () => {
    if (freePacksCount <= 0) return;
    
    setLoading(true);
    try {
      const packsToOpen = freePacksCount; // Open all available
      const totalCards = packsToOpen * 5;
      
      const terms = [
        'pop en español', 'rock en español', 'reggaeton', 'latin pop', 
        'pop', 'rock', 'hip hop', 'indie', 
        'pop italiano', 'chanson', 'j-pop', 'anime', 'k-pop'
      ];
      const term = terms[Math.floor(Math.random() * terms.length)];
      
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=${Math.max(15, totalCards)}`);
      const data = await res.json();
      
      if (!data.results || data.results.length === 0) throw new Error('No results');

      const shuffled = data.results.sort(() => 0.5 - Math.random());
      const selectedTracks = shuffled.slice(0, totalCards);
      
      const newCards = selectedTracks.map((track: any) => generateCard(track));
      
      if (consumeFreePack(packsToOpen)) {
        const results = newCards.map((card: CardData) => {
          const res = usePlayerStore.getState().addCard(card);
          
          // Log discovery
          const playerName = usePlayerStore.getState().discoveryUsername || auth.currentUser?.displayName || (language === 'es' ? 'Un Jugador' : 'A Player');
          logDiscovery(card, playerName);

          return { card, isDuplicate: res.convertedToWildcard };
        });
        
        setOpenedCards(results);
        setFlippedCards(new Set());
        setIsOpening(true);
      }
    } catch (error) {
      console.error('Error opening free packs:', error);
      toast.error(t(language, 'home', 'errorPacks'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOpening = () => {
    setIsOpening(false);
    setOpenedCards([]);
    setFlippedCards(new Set());
  };

  const toggleFlip = (index: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 relative min-h-screen pb-24">
      {/* Stats Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Regalías</p>
            <p className="text-sm font-black">{mounted ? regalias.toLocaleString() : '---'}</p>
          </div>
        </div>
        <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Music className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Total Cartas</p>
            <p className="text-sm font-black">{mounted ? Object.keys(inventory).length : '---'}</p>
          </div>
        </div>
        {globalStats && (
          <>
            <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Descubiertas</p>
                <p className="text-sm font-black">{globalStats.totalUnique}</p>
              </div>
            </div>
            <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Hallazgos Totales</p>
                <p className="text-sm font-black">{globalStats.totalDiscoveries}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-end mt-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">{t(language, 'home', 'title')}</h1>
          <p className="text-gray-400 font-medium">{t(language, 'home', 'subtitle')}</p>
        </div>
      </div>

      {/* Hero Section / Free Packs */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-black border border-white/10 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <div className="relative group cursor-pointer" onClick={handleOpenFreePacks}>
            <Pack 
              type="FREE" 
              className="scale-90 group-hover:scale-100 transition-transform duration-500"
            />
            {freePacksCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-black animate-bounce shadow-lg">
                {freePacksCount}
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-2xl font-bold">{t(language, 'home', 'freePacks')}</h2>
            <p className="text-gray-300 text-sm mt-1">{t(language, 'home', 'freePacksDesc')}</p>
          </div>
          
          <div className="flex items-center gap-2 my-2">
            <span className="text-4xl font-black">{freePacksCount}</span>
            <span className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">/ 10</span>
          </div>

          <button 
            onClick={handleOpenFreePacks}
            disabled={loading || freePacksCount === 0}
            className="w-full max-w-xs bg-white text-black font-bold py-3 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {freePacksCount > 1 ? t(language, 'home', 'openPacks', { count: freePacksCount }) : t(language, 'home', 'openPack')}
          </button>
        </div>
      </div>

      {/* Daily Missions */}
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          {t(language, 'home', 'dailyMissions')}
        </h3>
        <div className="space-y-3">
          {dailyMissions?.map((mission) => (
            <div key={mission.id} className="bg-[#121212] p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm">{mission.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{t(language, 'home', 'reward')}: <span className="text-yellow-400 font-bold">{mission.reward} Regalías</span></p>
                </div>
                <span className="text-xs font-mono bg-[#242424] px-2 py-1 rounded-md text-gray-300">
                  {mission.progress} / {mission.target}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#242424] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${mission.completed ? 'bg-green-500' : 'bg-white'}`}
                  style={{ width: `${(mission.progress / mission.target) * 100}%` }}
                />
              </div>

              {mission.completed && (
                <button 
                  onClick={() => claimMissionReward(mission.id)}
                  className="mt-2 w-full bg-green-500/20 text-green-400 font-bold py-2 rounded-xl text-sm hover:bg-green-500/30 transition-colors border border-green-500/30"
                >
                  {t(language, 'home', 'claimReward')}
                </button>
              )}
            </div>
          ))}
          {(!dailyMissions || dailyMissions.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">{t(language, 'home', 'noMissions')}</p>
          )}
        </div>
      </div>

      {/* Quick Action */}
      <Link href="/play" className="mt-4 block w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white border border-white/10 font-bold py-4 rounded-2xl hover:scale-[1.02] transition-transform text-center shadow-lg">
        {t(language, 'home', 'playButton')}
      </Link>

      {/* Global Discoveries */}
      {recentDiscoveries.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            {t(language, 'home', 'globalDiscoveries') || 'Descubrimientos Globales'}
          </h3>
          
          {globalStats && (
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Object.entries(globalStats.rarityCounts).map(([rarity, count]: [any, any]) => (
                <div key={rarity} className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                  <p className={`text-[8px] font-black ${
                    rarity === 'PLATINUM' ? 'text-white' : 
                    rarity === 'GOLD' ? 'text-amber-400' : 
                    rarity === 'RARE' ? 'text-purple-400' : 
                    rarity === 'UNCOMMON' ? 'text-blue-400' : 'text-gray-400'
                  }`}>{rarity}</p>
                  <p className="text-xs font-bold">{count}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {recentDiscoveries.map((discovery) => (
              <div 
                key={discovery.id} 
                className="flex-shrink-0 w-48 bg-[#121212] rounded-2xl border border-white/5 overflow-hidden group"
              >
                <div className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={discovery.artUrl} 
                    alt={discovery.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">{discovery.artist}</p>
                    <p className="text-xs font-bold text-white truncate">{discovery.name}</p>
                  </div>
                </div>
                <div className="p-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <Music className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] text-gray-500 uppercase">Encontrado por</p>
                    <p className="text-[10px] font-bold text-white truncate">{discovery.discoveredBy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pack Opening Modal */}
      <AnimatePresence>
        {isOpening && openedCards.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-hidden"
          >
            {/* Background Particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 0.5, 0], 
                    scale: [0, 1, 0],
                    x: [0, (Math.random() - 0.5) * 1200],
                    y: [0, (Math.random() - 0.5) * 1200]
                  }}
                  transition={{ duration: 3, repeat: Infinity, delay: Math.random() * 3 }}
                  className="absolute left-1/2 top-1/2 w-1 h-1 bg-white rounded-full blur-[1px]"
                />
              ))}
            </div>

            <div className="max-w-7xl w-full flex flex-col items-center relative z-10">
              <div className="text-center mb-8">
                <motion.h2 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-4xl font-black text-white mb-2 tracking-tighter italic uppercase"
                >
                  {t(language, 'home', 'freePacks')}
                </motion.h2>
                <p className="text-gray-400 text-sm">{t(language, 'store', 'tapToReveal')}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full max-w-6xl px-4 mb-12">
                {openedCards.map((item, i) => {
                  const isRare = item.card.rarity === 'GOLD' || item.card.rarity === 'PLATINUM';
                  const isFlipped = flippedCards.has(i);
                  
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotateY: 180, opacity: 0, y: 100 }}
                      animate={{ 
                        scale: 1, 
                        rotateY: isFlipped ? 0 : 180, 
                        opacity: 1,
                        y: 0
                      }}
                      transition={{ 
                        delay: i * 0.05,
                        rotateY: { duration: 0.6, type: "spring", stiffness: 260, damping: 20 }
                      }}
                      onClick={() => !isFlipped && toggleFlip(i)}
                      className="relative cursor-pointer perspective-1000 group"
                    >
                      <div className={`relative w-40 sm:w-48 aspect-[2.5/3.5] preserve-3d transition-all duration-500 ${isFlipped ? '' : 'hover:scale-105'}`}>
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

                      {/* Card Back */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-[#242424] to-[#121212] rounded-xl border-2 border-white/10 flex flex-col items-center justify-center gap-4 shadow-2xl group hover:border-white/30 transition-colors overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                          <Music className="text-gray-600" size={32} />
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest relative z-10">
                          {isRare ? (
                            <span className="text-amber-500 flex items-center gap-1 animate-pulse">
                              <Sparkles size={10} /> {t(language, 'store', 'tapToReveal')}
                            </span>
                          ) : t(language, 'home', 'nextCard')}
                        </div>
                        {isRare && (
                          <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-md">
                {flippedCards.size < openedCards.length && (
                  <button
                    onClick={() => {
                      const all = new Set(openedCards.map((_, i) => i));
                      setFlippedCards(all);
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    {t(language, 'store', 'revealAll')}
                  </button>
                )}
                
                {flippedCards.size === openedCards.length && (
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={handleFinishOpening}
                    className="flex-1 bg-white text-black font-black py-4 px-12 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] uppercase tracking-tighter italic"
                  >
                    {t(language, 'home', 'finish')}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
