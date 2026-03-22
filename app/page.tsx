'use client';

import Link from 'next/link';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useEffect, useState, useMemo } from 'react';
import { Gift, CheckCircle, Loader2, Play, Star, Eye, Globe, Music, Sparkles, TrendingUp, ChevronRight, Shield, Settings as SettingsIcon, Radio, Music2, EyeOff, LayoutPanelTop } from 'lucide-react';
import { toast } from 'sonner';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import CardBack from '@/components/CardBack';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '@/lib/i18n';
import { getRecentDiscoveries, logDiscovery, getGlobalStats } from '@/lib/discovery';
import Pack from '@/components/store/Pack';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import PackOpenModal, { OpenedCardItem } from '@/components/store/PackOpenModal';
import { getMythicTrackIds } from '@/lib/admin/mythicService';
import { registerMythicDiscovery, generateMythicDiscoveryMessage, generateMythicStatusMessage, getUserMythicStats } from '@/lib/mythic/mythicTracker';
import RankingDisplay from '@/components/RankingDisplay';
import ChestQueue from '@/components/monetization/ChestQueue';
import CosmeticShopBanner from '@/components/monetization/CosmeticShopBanner';
import BattlePassBanner from '@/components/monetization/BattlePassBanner';
import { ChestType, CHEST_CONFIG } from '@/lib/monetization/chestSystem';
import { shouldShowAds } from '@/lib/auth/roleSystem';
import BotDifficultySelector from '@/components/BotDifficultySelector';
import { useBotMatch, useDeckPower } from '@/hooks/useBotMatch';
import { BotDifficulty } from '@/types/multiplayer';
import { useRouter } from 'next/navigation';
import { MasterCardTemplate } from '@/types/types';
import { getOnboardingState } from '@/lib/onboarding/onboardingState';

// ═════════════════════════════════════════
// COMPONENTE DE CARTA EN SOBRE (flip CSS puro)
// ═════════════════════════════════════════
// Feature 5: FreePackCard is now handled by PackOpenModal. FlipCard in PackOpenModal replaces it.

// ═════════════════════════════════════════
// HOME PAGE
// ═════════════════════════════════════════
export default function Home() {
  const {
    freePacksCount,
    checkHourlyPacks,
    consumeFreePack,
    dailyMissions,
    checkDailyMissions,
    claimMissionReward,
    language,
    regalias,
    inventory,
    discoveryUsername,
    isPaying,
    role,
    featureFlags
  } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openedCards, setOpenedCards] = useState<OpenedCardItem[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [revealingAll, setRevealingAll] = useState(false);
  const [mythicStats, setMythicStats] = useState<{
    totalMythicCards: number;
    uniqueDiscoveries: number;
    sharedDiscoveries: number;
  }>({ totalMythicCards: 0, uniqueDiscoveries: 0, sharedDiscoveries: 0 });
  const [recentDiscoveries, setRecentDiscoveries] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);

  const router = useRouter();
  const [showBotSelector, setShowBotSelector] = useState(false);
  const [selectedBotDeck, setSelectedBotDeck] = useState<{ id: string, cards: MasterCardTemplate[] } | null>(null);

  const { state: botState, createBotMatch } = useBotMatch();
  const { power: deckPower } = useDeckPower(selectedBotDeck?.cards || null);

  const decksObj = usePlayerStore(state => state.decks);
  const inventoryObj = usePlayerStore(state => state.inventory);

  const handleStartBotMatch = async (difficulty: BotDifficulty) => {
    if (!selectedBotDeck) return;
    const matchId = await createBotMatch(selectedBotDeck.cards, difficulty);
    if (matchId) {
      router.push(`/play?roomId=${matchId}&mode=VS_BOT&difficulty=${difficulty}&deckId=${selectedBotDeck.id}`);
    }
  };

  const allRevealed = openedCards.length > 0 && openedCards.every(c => c.revealed);

  useEffect(() => {
    setMounted(true);
    checkHourlyPacks();
    checkDailyMissions();
    getRecentDiscoveries(6).then(setRecentDiscoveries);
    getGlobalStats().then(setGlobalStats);
    
    // Cargar estadísticas de cartas míticas
    const loadMythicStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const stats = await getUserMythicStats(session.user.id);
        setMythicStats(stats);
      }
    };
    loadMythicStats();

    // -- Onboarding Detection --
    const onboarding = getOnboardingState();
    if (!usePlayerStore.getState().hasReceivedInitialPacks) {
      usePlayerStore.setState(state => ({
        freePacksCount: state.freePacksCount + 8,
        regalias: state.regalias + 2500, // 2500 regalias de regalo inicial
        hasReceivedInitialPacks: true,
      }));
      toast.success('¡Bienvenido! Recibiste 8 sobres y 2500 ✦ de inicio 🎁');
    }

    // Start tutorial battle if in that phase
    if (!usePlayerStore.getState().hasCompletedOnboarding && onboarding.currentPhase === 'welcome') {
      // We keep them on home until they click 'Start Tutorial' or similar
    }

    const interval = setInterval(() => {
      checkHourlyPacks();
      checkDailyMissions();
      getRecentDiscoveries(6).then(setRecentDiscoveries);
    }, 60000);
    return () => clearInterval(interval);
  }, [checkHourlyPacks, checkDailyMissions, language]);

  const handleOpenFreePacks = async () => {
    if (freePacksCount <= 0) return;
    setLoading(true);
    try {
      const mythicTrackIds = await getMythicTrackIds();
      const packsToOpen = freePacksCount;
      const totalCards = packsToOpen * 5;

      const resultsPool = await Promise.all([
        fetch(`https://itunes.apple.com/search?term=pop&entity=song&limit=50`).then(r => r.json()),
        fetch(`https://itunes.apple.com/search?term=rock&entity=song&limit=50`).then(r => r.json())
      ]);

      const allTracks = resultsPool.flatMap(r => r.results || []);
      const shuffled = allTracks.sort(() => 0.5 - Math.random());
      const selectedTracks = shuffled.slice(0, totalCards);

      const items: OpenedCardItem[] = [];
      let newMythicDiscoveries = 0;
      
      for (const track of selectedTracks) {
        const card = generateCard(track, undefined, undefined, mythicTrackIds);
        const res = usePlayerStore.getState().addCard(card);
        const revealed = card.rarity !== 'PLATINUM' && card.rarity !== 'MYTHIC';
        const playerName = discoveryUsername || 'Un Jugador';
        
        // Manejar descubrimientos de cartas míticas
        if (card.rarity === 'MYTHIC') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const discovery = await registerMythicDiscovery(card, session.user.id);
            
            if (discovery.isUniqueOwner) {
              toast.success(generateMythicDiscoveryMessage(discovery), {
                duration: 8000,
                icon: '🌟'
              });
              newMythicDiscoveries++;
            } else {
              toast.success(`✨ Descubriste "${card.name}"! ${discovery.totalOwners} jugadores tienen esta carta mítica.`, {
                duration: 6000,
                icon: '🎯'
              });
            }
          }
        }
        
        logDiscovery(card, playerName);
        items.push({ card, isDuplicate: res.convertedToWildcard, revealed });
      }

      const rarityOrder = { BRONZE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3, MYTHIC: 4 };
      items.sort((a, b) => (rarityOrder[a.card.rarity] || 0) - (rarityOrder[b.card.rarity] || 0));

      if (consumeFreePack(packsToOpen)) {
        setOpenedCards(items);
        setIsOpening(true);
        
        // Actualizar estadísticas de cartas míticas
        if (newMythicDiscoveries > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const stats = await getUserMythicStats(session.user.id);
            setMythicStats(stats);
            toast.success(generateMythicStatusMessage(stats.totalMythicCards), {
              duration: 5000,
              icon: '🏆'
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al abrir sobres gratis');
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
      setOpenedCards(prev => prev.map((c, idx) => idx === i ? { ...c, revealed: true } : c));
      await new Promise(r => setTimeout(r, 150));
    }
    setRevealingAll(false);
  };

  const closeOpening = () => {
    setIsOpening(false);
    setOpenedCards([]);
  };

  return (
    <div className="flex flex-col gap-6 relative min-h-screen pb-28">

      {/* ── SECCIÓN ADMINISTRATIVA (Modular) ── */}
      {mounted && role === 'ADMIN' && (
        <div className="bg-red-500/10 border-2 border-dashed border-red-500/20 p-4 rounded-3xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-400">
            <Shield className="w-5 h-5" />
            <h2 className="font-black uppercase tracking-widest text-sm">Panel de Control Modular (Developer)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['cosmetics', 'skins', 'battlePass', 'ads'] as const).map((flagId) => {
              const info = {
                cosmetics: { label: 'Cosméticos', icon: <Sparkles className="w-4 h-4" /> },
                skins: { label: 'Skins', icon: <Music2 className="w-4 h-4" /> },
                battlePass: { label: 'Pase de Batalla', icon: <LayoutPanelTop className="w-4 h-4" /> },
                ads: { label: 'Publicidad', icon: <Radio className="w-4 h-4" /> },
              }[flagId];
              const isEnabled = featureFlags[flagId];

              return (
                <button
                  key={flagId}
                  onClick={() => usePlayerStore.getState().updateFeatureFlag(flagId, !isEnabled)}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${isEnabled ? 'bg-red-500 text-white border-red-400' : 'bg-white/5 text-white/40 border-white/10 opacity-50'}`}
                >
                  {info.icon}
                  <span className="text-[10px] font-black uppercase">{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ESTADÍSTICAS DE CARTAS MÍTICAS ── */}
      {mythicStats.totalMythicCards > 0 && (
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-purple-500/20 p-3 rounded-2xl">
              <Star className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Colección Mítica</h3>
              <p className="text-purple-200/60 text-sm font-bold">Tus cartas más raras y exclusivas</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-purple-400">{mythicStats.totalMythicCards}</div>
              <div className="text-xs text-purple-200/60 uppercase font-bold">Total Míticas</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-pink-400">{mythicStats.uniqueDiscoveries}</div>
              <div className="text-xs text-pink-200/60 uppercase font-bold">Descubrimientos Únicos</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cyan-400">{mythicStats.sharedDiscoveries}</div>
              <div className="text-xs text-cyan-200/60 uppercase font-bold">Descubrimientos Compartidos</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECCIÓN DE ACCIÓN RÁPIDA (NUEVA PARTIDA) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* VS BOT */}
        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-cyan-500/20 p-2 sm:p-3 rounded-xl sm:rounded-2xl group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white italic tracking-tighter uppercase">VS LA MÁQUINA</h2>
              <p className="text-cyan-200/60 text-xs sm:text-sm font-bold">Practica y gana regalías contra el bot</p>
            </div>
          </div>
          <button
            onClick={() => setShowBotSelector(true)}
            className="w-full bg-cyan-500 text-black font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span className="hidden sm:inline">ELEGIR DIFICULTAD Y JUGAR</span>
            <span className="sm:hidden">JUGAR</span>
          </button>
        </div>

        {/* VS AMIGO / PVP */}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-purple-500/20 p-2 sm:p-3 rounded-xl sm:rounded-2xl group-hover:scale-105 transition-transform">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white italic tracking-tighter uppercase">RETAR AMIGO</h2>
              <p className="text-purple-200/60 text-xs sm:text-sm font-bold">Partidas en tiempo real contra otros jugadores</p>
            </div>
          </div>
          <Link
            href="/friends"
            className="w-full bg-purple-500 text-black font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-purple-400 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">BUSCAR RIVAL</span>
            <span className="sm:hidden">PVP</span>
          </Link>
        </div>
      </div>

      {/* ── SOBRES GRATIS (REDISEÑADO) ── */}
      <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
        <div className="flex items-center gap-4">
          <div className="relative">
            <Pack type="FREE" className="w-20" />
            {freePacksCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-black animate-bounce z-20">
                {freePacksCount}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Sobres Disponibles</h3>
            <p className="text-gray-500 text-xs font-bold">Abre cartas nuevas cada hora</p>
          </div>
        </div>
        <button
          onClick={handleOpenFreePacks}
          disabled={loading || freePacksCount === 0}
          className="bg-white text-black font-black py-3 px-8 rounded-2xl disabled:opacity-20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          {freePacksCount > 0 ? `ABRIR ${freePacksCount} SOBRE${freePacksCount > 1 ? 'S' : ''}` : 'SIN SOBRES'}
        </button>
      </div>

      {/* ── STATS RÁPIDAS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Regalías', value: mounted ? regalias.toLocaleString() : '—', icon: '✦', color: 'text-amber-400' },
          { label: 'Cartas', value: mounted ? Object.keys(inventory).length : '—', icon: '🎵', color: 'text-blue-400' },
          { label: 'Descubiertas', value: globalStats?.totalUnique ?? '—', icon: '🌍', color: 'text-purple-400' },
          { label: 'Total Global', value: globalStats?.totalDiscoveries ?? '—', icon: '📈', color: 'text-green-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">{s.label}</p>
              <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MONETIZACIÓN & RECOMPENSAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChestQueue />
        </div>
        <div className="flex flex-col gap-4">
          {featureFlags.cosmetics && <CosmeticShopBanner />}
          {featureFlags.battlePass && <BattlePassBanner />}

          {featureFlags.cosmetics && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 group hover:bg-emerald-500/20 transition-all cursor-pointer">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest">Oferta del Día</p>
                <p className="text-sm font-bold text-white">Sobre Legendario + 500 ✦</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── HALLAZGOS RECIENTES (DISEÑO PREMIUM) ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic">Hallazgos Recientes</h2>
          </div>
          <Link href="/studio?tab=discoveries" className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 group">
            Ver Todos <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {recentDiscoveries?.slice(0, 6).map((discovery, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer"
            >
              <div className="aspect-square relative">
                <Image src={discovery.artworkUrl} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter truncate">{discovery.discoveredBy || 'Anónimo'}</p>
                  <p className="text-[10px] font-black text-white truncate uppercase">{discovery.name}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>


      {/* Eliminados botones redundantes ya integrados arriba */}



      {/* ══════════════════════════════════════
          MODAL DE APERTURA DE SOBRES GRATIS
      ══════════════════════════════════════ */}
      <PackOpenModal
        isOpen={isOpening}
        cards={openedCards}
        onClose={closeOpening}
        onRevealCard={revealCard}
        onRevealAll={revealAll}
        isRevealingAll={revealingAll}
        title="Regalo Diario"
      />

      {/* MODAL: Selector de dificultad del bot */}
      <AnimatePresence>
        {showBotSelector && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBotSelector(false)}
          >
            <motion.div
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white italic tracking-tight gap-2 flex items-center">
                  <Play className="w-6 h-6 text-cyan-400" />
                  ELIGE TU RIVAL
                </h2>
                <button
                  onClick={() => setShowBotSelector(false)}
                  className="text-white/50 hover:text-white transition-colors text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              {!selectedBotDeck ? (
                <div className="space-y-6 mb-6">
                  <div className="text-center space-y-2">
                    <p className="text-gray-400 text-lg font-medium">
                      Elige el Sello Discográfico (Mazo) que llevarás al escenario.
                    </p>
                  </div>
                  {Object.keys(decksObj).length === 0 ? (
                    <div className="text-sm text-gray-400 p-8 bg-white/5 rounded-2xl border border-white/10 text-center font-bold tracking-widest">
                      NO TIENES MAZOS CREADOS. VE AL ESTUDIO PARA CREAR UNO.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.values(decksObj).map(deck => {
                        const count = Object.values(deck.cards).reduce((a, b) => a + b, 0);
                        const isValid = count >= 20;
                        return (
                          <motion.div
                            key={deck.id}
                            whileHover={isValid ? { scale: 1.02 } : {}}
                            onClick={() => {
                              if (!isValid) return;
                              const cards: MasterCardTemplate[] = [];
                              Object.entries(deck.cards).forEach(([cId, cCount]) => {
                                const cData = inventoryObj[cId]?.card;
                                if (cData) {
                                  for (let i = 0; i < cCount; i++) cards.push(cData);
                                }
                              });
                              setSelectedBotDeck({ id: deck.id, cards });
                            }}
                            className={`group relative overflow-hidden rounded-2xl border-2 transition-all p-4 flex flex-col items-center justify-center text-center ${isValid ? 'cursor-pointer border-white/10 bg-white/5 hover:border-cyan-500 hover:bg-cyan-500/10' : 'opacity-50 cursor-not-allowed border-red-500/20 bg-red-500/5'}`}
                          >
                            {deck.coverArt && (
                              <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity">
                                <Image src={deck.coverArt} alt="" fill className="object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                              </div>
                            )}
                            <div className="relative z-10">
                              <h3 className="text-xl font-black uppercase tracking-tighter mb-1 text-white">{deck.name}</h3>
                              <p className={`text-xs font-bold tracking-widest ${isValid ? 'text-cyan-400' : 'text-red-400'}`}>
                                {count} / 20 CARTAS
                              </p>
                              {!isValid && <p className="text-[9px] uppercase tracking-widest text-red-500 mt-2">Faltan cartas</p>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex justify-between items-center p-4 bg-cyan-900/20 rounded-xl border border-cyan-500/30">
                    <div>
                      <p className="text-white font-bold">Mazo listo para la batalla</p>
                      <p className="text-cyan-200 text-sm mt-1">
                        Poder evaluado: <span className="font-mono font-bold text-cyan-400">{deckPower}/100</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedBotDeck(null)}
                      className="text-white/50 hover:text-white text-sm underline"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className="mt-6">
                    <BotDifficultySelector
                      selectedDeck={selectedBotDeck?.cards || []}
                      onSelectDifficulty={(difficulty) => handleStartBotMatch(difficulty)}
                      onStartMatch={() => { }}
                      isLoading={botState.isCreating}
                      deckPowerScore={deckPower}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Tutorial Onboarding */}
      <AnimatePresence>
        {mounted && !usePlayerStore.getState().hasCompletedOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full space-y-8"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="bg-cyan-500/20 p-6 rounded-full border-2 border-cyan-500/30 animate-pulse">
                  <Play className="w-16 h-16 text-cyan-400 fill-current ml-2" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">¡Bienvenido Aventurero!</h1>
                  <p className="text-cyan-200/60 font-medium">Te hemos dado un kit de inicio: 8 sobres y 2500 ✦ regalías.</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-left space-y-4">
                <p className="text-sm text-gray-400 leading-relaxed font-bold">
                  ¿Es tu primera vez aquí? Antes de saltar a la arena global, necesitamos que aprendas las reglas de la melodía.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs text-cyan-300 font-black tracking-widest uppercase">
                    <CheckCircle className="w-4 h-4" /> 1. Aprende a Invocar
                  </div>
                  <div className="flex items-center gap-3 text-xs text-cyan-300 font-black tracking-widest uppercase opacity-50">
                    <CheckCircle className="w-4 h-4" /> 2. Abre tus primeros Sobres
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  router.push('/play?mode=TUTORIAL');
                }}
                className="w-full bg-cyan-500 text-black font-black py-5 rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_0_50px_rgba(6,182,212,0.4)] uppercase tracking-tighter text-xl"
              >
                ENTRAR A LA BATALLA DE PRUEBA
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
