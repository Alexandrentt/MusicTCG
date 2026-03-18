'use client';

import Link from 'next/link';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useEffect, useState, useMemo } from 'react';
import { Gift, CheckCircle, Loader2, Play, Star, Eye, Globe, Music, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import CardBack from '@/components/CardBack';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '@/lib/i18n';
import { getRecentDiscoveries, logDiscovery, getGlobalStats } from '@/lib/discovery';
import Pack from '@/components/store/Pack';
import { auth } from '@/lib/firebase';
import RankingDisplay from '@/components/RankingDisplay';
import ChestQueue from '@/components/monetization/ChestQueue';
import CosmeticShopBanner from '@/components/monetization/CosmeticShopBanner';
import BattlePassBanner from '@/components/monetization/BattlePassBanner';
import { ChestType, CHEST_CONFIG } from '@/lib/monetization/chestSystem';
import { shouldShowAds } from '@/lib/auth/roleSystem';

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
    addCards,
    language,
    regalias,
    inventory,
    discoveryUsername,
    isPaying,
    role
  } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openedCards, setOpenedCards] = useState<{ card: CardData; isDuplicate: boolean }[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [isOpening, setIsOpening] = useState(false);
  const [recentDiscoveries, setRecentDiscoveries] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);

  const allRevealed = openedCards.length > 0 && revealedSet.size === openedCards.length;

  useEffect(() => {
    setMounted(true);
    checkHourlyPacks();
    checkDailyMissions();
    getRecentDiscoveries(6).then(setRecentDiscoveries);
    getGlobalStats().then(setGlobalStats);

    if (!usePlayerStore.getState().hasReceivedInitialPacks) {
      usePlayerStore.setState(state => ({
        freePacksCount: state.freePacksCount + 8,
        hasReceivedInitialPacks: true,
      }));
      toast.success('¡Bienvenido! Recibiste 8 sobres de inicio 🎁');
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
      const terms = ['pop en español', 'rock en español', 'reggaeton', 'pop', 'hip hop', 'indie', 'k-pop', 'anime'];
      const term = terms[Math.floor(Math.random() * terms.length)];

      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${Math.max(15, totalCards)}`
      );
      const data = await res.json();
      if (!data.results?.length) throw new Error('No results');

      const shuffled = [...data.results].sort(() => 0.5 - Math.random());
      const tracks = shuffled.slice(0, totalCards);
      const newCards = tracks.map((track: any) => generateCard(track));

      if (consumeFreePack(packsToOpen)) {
        const results = newCards.map((card: CardData) => {
          const r = usePlayerStore.getState().addCard(card);
          const playerName = discoveryUsername || auth.currentUser?.displayName || 'Un Jugador';
          logDiscovery(card, playerName);
          return { card, isDuplicate: r.convertedToWildcard };
        });
        setOpenedCards(results);
        setRevealedSet(new Set());
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

      {/* ── HEADER HERO ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-indigo-950 to-black border border-white/10 p-6 shadow-2xl">
        {/* Efecto nebulosa */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-3xl rounded-full -mt-8 -mr-8 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Texto */}
          <div className="text-center sm:text-left">
            <p className="text-purple-300 text-xs uppercase tracking-widest font-bold mb-1">MusicTCG</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white leading-tight">
              {t(language, 'home', 'title') || 'Tu Playlist'}
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Cobra Vida
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              Abre sobres, construye tu setlist y hazla luchar.
            </p>
          </div>

          {/* Pack visual + contador */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative cursor-pointer group"
              onClick={freePacksCount > 0 ? handleOpenFreePacks : undefined}
            >
              <div className="absolute -inset-4 bg-white/5 blur-2xl rounded-full group-hover:bg-white/10 transition-all" />
              <Pack type="FREE" className="relative z-10 group-hover:scale-105 transition-transform duration-300" />
              {freePacksCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-emerald-500 text-black text-xs font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-black animate-bounce z-20 shadow-lg">
                  {freePacksCount}
                </div>
              )}
            </div>

            <button
              onClick={handleOpenFreePacks}
              disabled={loading || freePacksCount === 0}
              className="bg-white text-black font-black py-3 px-7 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {freePacksCount > 1
                ? `Abrir ${freePacksCount} sobres`
                : freePacksCount === 1
                  ? 'Abrir 1 sobre'
                  : 'Sin sobres disponibles'}
            </button>
          </div>
        </div>
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
          <CosmeticShopBanner />
          <BattlePassBanner />

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 group hover:bg-emerald-500/20 transition-all cursor-pointer">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Gift className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest">Oferta del Día</p>
              <p className="text-sm font-bold text-white">Sobre Legendario + 500 ✦</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🏆 RANKING & PROGRESO */}
      <RankingDisplay />

      {/* ── MISIONES DIARIAS ── */}
      <div>
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          Misiones del día
        </h3>
        <div className="space-y-2">
          {dailyMissions?.map((mission) => (
            <div
              key={mission.id}
              className={`bg-[#111] p-4 rounded-2xl border ${mission.completed ? 'border-green-500/30' : 'border-white/5'} flex flex-col gap-2`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{mission.description}</p>
                  <p className="text-xs text-gray-400">
                    Recompensa: <span className="text-yellow-400 font-bold">{mission.reward} ✦</span>
                  </p>
                </div>
                <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded-lg text-gray-300">
                  {mission.progress}/{mission.target}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${mission.completed ? 'bg-green-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(100, (mission.progress / mission.target) * 100)}%` }}
                />
              </div>
              {mission.completed && (
                <button
                  onClick={() => claimMissionReward(mission.id)}
                  className="w-full bg-green-500/20 text-green-400 font-bold py-2 rounded-xl text-sm hover:bg-green-500/30 transition-colors border border-green-500/30"
                >
                  ✅ Reclamar recompensa
                </button>
              )}
            </div>
          ))}
          {(!dailyMissions || dailyMissions.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">Sin misiones disponibles</p>
          )}
        </div>
      </div>

      {/* ── SECCIÓN PUBLICITARIA (Solo para FREE) ── */}
      {mounted && !isPaying && role !== 'ADMIN' && (
        <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-center group cursor-pointer hover:bg-white/10 transition-all border-dashed">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] mb-1">Publicidad</p>
          <p className="text-xs text-gray-500 font-medium italic">Compra 100 ✦ Premium para eliminar anuncios para siempre</p>
        </div>
      )}

      {/* ── BOTÓN JUGAR ── */}
      <Link
        href="/play"
        className="block w-full bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white font-black py-4 rounded-2xl text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg text-lg tracking-tight"
      >
        ▶ Jugar ahora
      </Link>



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
              <div className="shrink-0 p-4 border-t border-white/5 flex flex-col sm:flex-row gap-3 bg-black/50 backdrop-blur-md">
                {!allRevealed && (
                  <button
                    onClick={revealAll}
                    className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Revelar todas
                  </button>
                )}
                {allRevealed && (
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={closeOpening}
                    className="flex-1 bg-white text-black font-black py-3 px-8 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] uppercase tracking-tighter"
                  >
                    ¡Listo! →
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
