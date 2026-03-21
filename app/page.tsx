'use client';

import Link from 'next/link';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useEffect, useState, useMemo } from 'react';
import { Gift, CheckCircle, Loader2, Play, Star, Eye, Globe, Music, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Shield, Settings as SettingsIcon, Radio, Music2, EyeOff, LayoutPanelTop } from 'lucide-react';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import CardBack from '@/components/CardBack';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '@/lib/i18n';
import { getRecentDiscoveries, logDiscovery, getGlobalStats } from '@/lib/discovery';
import Pack from '@/components/store/Pack';
import { supabase } from '@/lib/supabase';
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
function FreePackCard({
  item,
  index,
  revealed,
  onReveal,
}: {
  item: { card: CardData; isDuplicate: boolean };
  index: number;
  revealed: boolean;
  onReveal: (i: number) => void;
}) {
  const isRare = item.card.rarity === 'GOLD' || item.card.rarity === 'PLATINUM';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 280, damping: 22 }}
      className="relative perspective-1000 cursor-pointer shrink-0"
      onClick={() => !revealed && onReveal(index)}
    >
      <div
        className="preserve-3d transition-all duration-700"
        style={{
          transform: revealed ? 'rotateY(0deg)' : 'rotateY(180deg)',
          width: 'clamp(140px, 30vw, 220px)',
          aspectRatio: '2.5 / 3.5',
          position: 'relative',
        }}
      >
        {/* Frente */}
        <div className="absolute inset-0 backface-hidden rounded-xl overflow-hidden">
          <Card data={item.card} className="w-full h-full" disableHover={!revealed} />
          {item.isDuplicate && (
            <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full z-10 border border-black">
              COMODÍN
            </div>
          )}
        </div>
        {/* Reverso */}
        <div
          className="absolute inset-0 backface-hidden rounded-xl overflow-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <CardBack className="w-full h-full" isRare={isRare} size="full" />
          {!revealed && (
            <div className="absolute inset-0 flex items-end justify-center pb-2">
              <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest animate-pulse">Toca</span>
            </div>
          )}
        </div>
      </div>

      {isRare && revealed && (
        <motion.div
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-1 rounded-xl blur-sm pointer-events-none"
          style={{
            background: item.card.rarity === 'PLATINUM'
              ? 'rgba(0,255,255,0.2)'
              : 'rgba(255,215,0,0.2)',
          }}
        />
      )}
    </motion.div>
  );
}

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
  const [openedCards, setOpenedCards] = useState<{ card: CardData; isDuplicate: boolean }[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [isOpening, setIsOpening] = useState(false);
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

  const allRevealed = openedCards.length > 0 && revealedSet.size === openedCards.length;

  useEffect(() => {
    setMounted(true);
    checkHourlyPacks();
    checkDailyMissions();
    getRecentDiscoveries(6).then(setRecentDiscoveries);
    getGlobalStats().then(setGlobalStats);

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
      const packsToOpen = freePacksCount;
      const totalCards = packsToOpen * 5;

      // ── Extreme Randomization Logic ──
      // We mix "Superhits" with "Deep Cuts" and "Random Characters" to ensure a wild variety.
      const superhits = ['billboard hot 100', 'top tracks 2024', 'legendary rock hits', 'reggaeton classics', 'pop superstars'];
      const hiddenGems = ['experimental underground', 'lofi indie records', 'obscure electronic', 'undiscovered jazz', 'garage band archives'];
      const searchLetters = "abcdefghijklmnopqrstuvwxyz";
      const randomChar = searchLetters.charAt(Math.floor(Math.random() * searchLetters.length));

      const pools = [
        superhits[Math.floor(Math.random() * superhits.length)],
        hiddenGems[Math.floor(Math.random() * hiddenGems.length)],
        randomChar
      ];

      // Fetch from multiple sources to mix the results
      const results = await Promise.all(pools.map(term =>
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=50`).then(r => r.json())
      ));

      const allTracks = results.flatMap(r => r.results || []);
      if (!allTracks.length) throw new Error('No records retrieved from the cloud');

      // Shuffle and pick
      const shuffled = allTracks.sort(() => 0.5 - Math.random());
      const selectedTracks = shuffled.slice(0, totalCards);
      const newCards = selectedTracks.map((track: any) => generateCard(track));


      if (consumeFreePack(packsToOpen)) {
        const { data: { session } } = await supabase.auth.getSession();
        const results = newCards.map((card: CardData) => {
          const r = usePlayerStore.getState().addCard(card);
          const playerName = discoveryUsername || session?.user?.user_metadata?.full_name || 'Un Jugador';
          logDiscovery(card, playerName);
          return { card, isDuplicate: r.convertedToWildcard };
        });
        setRevealedSet(new Set(
          results
            .map((r, idx) => (r.card.rarity !== 'PLATINUM' ? idx : -1))
            .filter(idx => idx !== -1)
        ));
        setOpenedCards(results);
        setIsOpening(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al abrir sobres. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const revealCard = (index: number) => {
    setRevealedSet(prev => new Set([...prev, index]));
  };

  const revealAll = async () => {
    for (let i = 0; i < openedCards.length; i++) {
      setRevealedSet(prev => new Set([...prev, i]));
      await new Promise(r => setTimeout(r, 120));
    }
  };

  const closeOpening = () => {
    setIsOpening(false);
    setOpenedCards([]);
    setRevealedSet(new Set());
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

      {/* ── SECCIÓN DE ACCIÓN RÁPIDA (NUEVA PARTIDA) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VS BOT */}
        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 rounded-3xl p-6 flex flex-col gap-4 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all group">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">VS LA MÁQUINA</h2>
              <p className="text-cyan-200/60 text-xs font-bold">Practica y gana regalías contra el bot</p>
            </div>
          </div>
          <button
            onClick={() => setShowBotSelector(true)}
            className="w-full bg-cyan-500 text-black font-black py-4 rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            ELEGIR DIFICULTAD Y JUGAR
          </button>
        </div>

        {/* VS AMIGO / PVP */}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-3xl p-6 flex flex-col gap-4 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all group">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <Globe className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">RETAR AMIGO</h2>
              <p className="text-purple-200/60 text-xs font-bold">Partidas en tiempo real contra otros jugadores</p>
            </div>
          </div>
          <Link
            href="/friends"
            className="w-full bg-purple-500 text-black font-black py-4 rounded-2xl hover:bg-purple-400 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 text-center"
          >
            <TrendingUp className="w-5 h-5" />
            BUSCAR RIVAL
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
                <img src={discovery.artworkUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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
      <AnimatePresence>
        {isOpening && openedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col bg-black/97 backdrop-blur-2xl overflow-hidden"
          >
            {/* Partículas estáticas */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-0.5 bg-white/15 rounded-full"
                  style={{ left: `${(i * 11.3) % 100}%`, top: `${(i * 17.7) % 100}%` }}
                />
              ))}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              {/* Cabecera */}
              <div className="shrink-0 text-center pt-6 pb-3 px-4">
                <motion.h2
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-2xl font-black text-white tracking-tighter italic uppercase"
                >
                  🎁 {openedCards.length} Cartas Gratis
                </motion.h2>
                <p className="text-gray-500 text-xs mt-1">
                  {allRevealed ? '✅ ¡Todas reveladas!' : 'Toca cada carta para revelarla'}
                </p>
              </div>

              {/* Grid de cartas */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
                <div className="flex flex-wrap gap-3 justify-center py-4">
                  {openedCards.map((item, i) => (
                    <FreePackCard
                      key={i}
                      item={item}
                      index={i}
                      revealed={revealedSet.has(i)}
                      onReveal={revealCard}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 p-6 border-t border-white/5 flex flex-col gap-3 bg-black/90 backdrop-blur-xl sticky bottom-0 z-[600] pb-32">
                {!allRevealed && (
                  <button
                    onClick={revealAll}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                  >
                    <Eye className="w-5 h-5" />
                    Revelar Rarezas
                  </button>
                )}
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={closeOpening}
                  className="w-full bg-white text-black font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] uppercase tracking-tighter text-base border-4 border-white/10"
                >
                  {allRevealed ? 'CONTINUAR →' : 'OMITIR Y CONTINUAR'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="space-y-4 mb-6">
                  <label className="block text-white/80 font-bold mb-2">Selecciona tu mazo para la batalla:</label>
                  {Object.keys(decksObj).length === 0 ? (
                    <div className="text-sm text-gray-400 p-4 bg-white/5 rounded-lg text-center">
                      No tienes mazos creados. Ve al estudio para crear uno.
                    </div>
                  ) : (
                    <select
                      onChange={(e) => {
                        const deckId = e.target.value;
                        const deck = decksObj[deckId];
                        if (deck) {
                          const cards: MasterCardTemplate[] = [];
                          Object.entries(deck.cards).forEach(([cId, count]) => {
                            const cData = inventoryObj[cId]?.card;
                            if (cData) {
                              for (let i = 0; i < count; i++) cards.push(cData);
                            }
                          });
                          setSelectedBotDeck({ id: deckId, cards });
                        } else {
                          setSelectedBotDeck(null);
                        }
                      }}
                      className="w-full p-3 bg-[#111] border border-white/20 rounded-xl text-white outline-none focus:border-cyan-500 transition-colors"
                      defaultValue=""
                    >
                      <option value="" disabled>-- Selecciona un mazo --</option>
                      {Object.values(decksObj).map(deck => {
                        const count = Object.values(deck.cards).reduce((a, b) => a + b, 0);
                        return <option key={deck.id} value={deck.id}>{deck.name} ({count} cartas)</option>
                      })}
                    </select>
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
