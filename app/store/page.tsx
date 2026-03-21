'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { generateCard, CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import CardBack from '@/components/CardBack';
import { Loader2, Sparkles, Eye, Zap, Star, Music2, Disc3, Waves, Radio, Flame, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import { logDiscovery } from '@/lib/discovery';
import { supabase } from '@/lib/supabase';
import Pack from '@/components/store/Pack';
import { processPurchase } from '@/lib/auth/paymentSystem';
import { UserRole } from '@/lib/auth/roleSystem';
import PackOpenModal, { OpenedCardItem } from '@/components/store/PackOpenModal';
import { getMythicTrackIds } from '@/lib/admin/mythicService';

// ═════════════════════════════════════════
// TIPOS DE SOBRE
// ═════════════════════════════════════════
interface PackType {
  id: string;
  nameKey: string;
  descKey: string;
  cost: number;
  gradient: string;
  accent: string;
  icon: React.ReactNode;
  emoji: string;
  terms: string[];
  guarantee: string;
}

const PACK_TYPES: PackType[] = [
  {
    id: 'basic',
    nameKey: 'basicPack',
    descKey: 'basicDesc',
    cost: 100,
    gradient: 'from-slate-800 via-slate-900 to-black',
    accent: 'border-slate-500/40',
    icon: <Music2 className="w-5 h-5" />,
    emoji: '🎵',
    terms: ['hits', 'top', 'music', 'popular'],
    guarantee: '5 cartas aleatorias',
  },
  {
    id: 'pop',
    nameKey: 'popPack',
    descKey: 'popDesc',
    cost: 250,
    gradient: 'from-pink-900 via-rose-900 to-black',
    accent: 'border-pink-500/40',
    icon: <Star className="w-5 h-5" />,
    emoji: '💖',
    terms: ['pop', 'r&b', 'dance pop', 'latin pop'],
    guarantee: '1 garantizada SILVER+',
  },
  {
    id: 'rock',
    nameKey: 'rockPack',
    descKey: 'rockDesc',
    cost: 250,
    gradient: 'from-red-900 via-red-950 to-black',
    accent: 'border-red-500/40',
    icon: <Zap className="w-5 h-5" />,
    emoji: '🎸',
    terms: ['rock', 'metal', 'punk', 'grunge', 'alternative rock'],
    guarantee: '1 garantizada SILVER+',
  },
  {
    id: 'electronic',
    nameKey: 'electronicPack',
    descKey: 'electronicDesc',
    cost: 250,
    gradient: 'from-cyan-900 via-blue-900 to-black',
    accent: 'border-cyan-500/40',
    icon: <Waves className="w-5 h-5" />,
    emoji: '🎛️',
    terms: ['electronic', 'dance', 'house', 'techno', 'edm'],
    guarantee: '1 garantizada SILVER+',
  },
  {
    id: 'hiphop',
    nameKey: 'hipHopPack',
    descKey: 'hipHopDesc',
    cost: 300,
    gradient: 'from-amber-900 via-orange-950 to-black',
    accent: 'border-amber-500/40',
    icon: <Radio className="w-5 h-5" />,
    emoji: '🎤',
    terms: ['hip hop', 'rap', 'trap', 'reggaeton', 'urbano'],
    guarantee: '1 garantizada GOLD',
  },
  {
    id: 'legends',
    nameKey: 'legendsPack',
    descKey: 'legendsDesc',
    cost: 500,
    gradient: 'from-amber-700 via-yellow-900 to-black',
    accent: 'border-yellow-500/40',
    icon: <Sparkles className="w-5 h-5 text-yellow-400" />,
    emoji: '🧙',
    terms: ['legendary', 'classic', 'masterpiece', 'iconic'],
    guarantee: '1 garantizada PLATINUM+',
  },
  {
    id: 'latino',
    nameKey: 'latinoPack',
    descKey: 'latinoDesc',
    cost: 250,
    gradient: 'from-orange-800 via-red-900 to-black',
    accent: 'border-orange-500/40',
    icon: <Disc3 className="w-5 h-5" />,
    emoji: '💃',
    terms: ['latino', 'reggaeton', 'salsa', 'bachata', 'merengue', 'latin'],
    guarantee: '1 garantizada SILVER+',
  },
  {
    id: 'soul_blues',
    nameKey: 'soulBluesPack',
    descKey: 'soulBluesDesc',
    cost: 250,
    gradient: 'from-indigo-900 via-blue-950 to-black',
    accent: 'border-indigo-400/40',
    icon: <Waves className="w-5 h-5" />,
    emoji: '🎷',
    terms: ['soul', 'blues', 'jazz', 'gospel', 'funk'],
    guarantee: '1 garantizada SILVER+',
  },
  {
    id: 'indie',
    nameKey: 'indiePack',
    descKey: 'indieDesc',
    cost: 150,
    gradient: 'from-emerald-900 via-teal-950 to-black',
    accent: 'border-emerald-400/40',
    icon: <Radio className="w-5 h-5" />,
    emoji: '🌱',
    terms: ['indie', 'alternative', 'folk', 'lo-fi'],
    guarantee: '5 cartas aleatorias',
  },
];

// ═════════════════════════════════════════
// COMPONENTE CARTA EN SOBRE (con flip CSS puro)
// ═════════════════════════════════════════
function PackCard({
  item,
  index,
  onReveal,
  onInspect,
  mousePos,
}: {
  item: { card: CardData; isDuplicate: boolean; revealed: boolean };
  index: number;
  onReveal: (i: number) => void;
  onInspect: (card: CardData) => void;
  mousePos: { x: number; y: number };
}) {
  const isRare = item.card.rarity === 'GOLD' || item.card.rarity === 'PLATINUM';
  const cardRef = useRef<HTMLDivElement>(null);

  // Line of Vision Effect for rare cards
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isRare && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = mousePos.x - centerX;
      const dy = mousePos.y - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 400) {
        // Move towards the vision point (slightly)
        setOffset({
          x: (dx / dist) * 10,
          y: (dy / dist) * 10
        });
      } else {
        setOffset({ x: 0, y: 0 });
      }
    }
  }, [mousePos, isRare]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ scale: 0, opacity: 0, y: 60 }}
      animate={{
        scale: 1,
        opacity: 1,
        x: offset.x,
        y: offset.y
      }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
      className="relative perspective-1000 cursor-pointer shrink-0"
      onClick={() => item.revealed ? onInspect(item.card) : onReveal(index)}
    >
      {/* Contenedor 3D */}
      <div
        className="preserve-3d transition-all duration-700"
        style={{
          transform: item.revealed ? 'rotateY(0deg)' : 'rotateY(180deg)',
          width: 'clamp(200px, 25vw, 240px)', // Canonical size approach
          aspectRatio: '2.5 / 3.5',
          position: 'relative',
        }}
      >
        {/* FRENTE (carta) */}
        <div className="absolute inset-0 backface-hidden rounded-xl overflow-hidden shadow-2xl">
          <Card
            data={item.card}
            className="w-full h-full"
            disableHover={!item.revealed}
          />
          {item.isDuplicate && (
            <div className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-black z-20">
              COMODÍN
            </div>
          )}
        </div>

        {/* REVERSO (contraportada) */}
        <div
          className="absolute inset-0 backface-hidden rounded-xl overflow-hidden shadow-2xl"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <CardBack className="w-full h-full" isRare={isRare} size="full" />
          {!item.revealed && (
            <div className="absolute inset-0 flex items-end justify-center pb-6">
              <span className="text-[10px] text-white/80 font-black uppercase tracking-[0.2em] animate-pulse bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                Revelar
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Aura de rareza (visible cuando ya está revelada) */}
      {isRare && item.revealed && (
        <motion.div
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-2 rounded-2xl blur-md pointer-events-none"
          style={{
            background: item.card.rarity === 'PLATINUM'
              ? 'rgba(0,255,255,0.3)'
              : 'rgba(255,180,0,0.3)',
            zIndex: -1
          }}
        />
      )}
    </motion.div>
  );
}

// ═════════════════════════════════════════
// PÁGINA PRINCIPAL DE LA TIENDA
// ═════════════════════════════════════════
export default function StorePage() {
  const {
    regalias,
    spendRegalias,
    addCard,
    language,
    pityCounters,
    incrementPity,
    resetPity,
    activeStoreTab,
    setActiveStoreTab,
    featureFlags
  } = usePlayerStore();

  const premiumGold = usePlayerStore((state) => state.premiumGold);

  const [mounted, setMounted] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // pack id que se está cargando
  const [openedCards, setOpenedCards] = useState<{ card: CardData; isDuplicate: boolean; revealed: boolean }[]>([]);
  const [revealingAll, setRevealingAll] = useState(false);
  const [currentPack, setCurrentPack] = useState<PackType | null>(null);
  const [packPhase, setPackPhase] = useState<'pack' | 'cards'>('pack');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [lyricsContent, setLyricsContent] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => { setMounted(true); }, []);

  // Mouse move listener for "Line of Vision" effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Lyrics fetching logic
  useEffect(() => {
    if (selectedCard) {
      const fetchLyrics = async () => {
        setLoadingLyrics(true);
        try {
          const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(selectedCard.artist)}/${encodeURIComponent(selectedCard.name)}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          setLyricsContent(data.lyrics || null);
        } catch (e) {
          setLyricsContent(null);
        } finally {
          setLoadingLyrics(false);
        }
      };
      fetchLyrics();
    } else {
      setLyricsContent(null);
    }
  }, [selectedCard]);

  const handleBuyPack = async (pack: PackType, quantity: number = 1) => {
    const totalCost = pack.cost * quantity;
    if (regalias < totalCost) {
      toast.error('No tienes suficientes Regalías ✦');
      return;
    }

    setLoading(pack.id);
    try {
      const term = pack.terms[Math.floor(Math.random() * pack.terms.length)];
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${Math.min(50, 20 * quantity)}`
      );
      const data = await res.json();

      if (!data.results || data.results.length === 0) throw new Error('No results');

      let allTracks = [...data.results];
      while (allTracks.length < 5 * quantity) {
        allTracks = [...allTracks, ...data.results];
      }
      const shuffled = allTracks.sort(() => 0.5 - Math.random());
      const selectedTracks = shuffled.slice(0, 5 * quantity);

      const mythicTrackIds = await getMythicTrackIds();

      const newCards: CardData[] = [];

      for (let i = 0; i < selectedTracks.length; i++) {
        const track = selectedTracks[i];
        let forcedRarity: CardData['rarity'] | undefined;

        // Apply guarantee for the last card of EACH pack
        const isLastCardOfPack = (i + 1) % 5 === 0;

        if (pack.id === 'legends' && packPhase === 'pack' && isLastCardOfPack) { // packPhase use is legacy but keeping logic stable
          forcedRarity = Math.random() > 0.75 ? 'PLATINUM' : 'GOLD';
        }
        // Simplified check since packPhase is now managed by Modal
        if (pack.id === 'legends' && (i + 1) === selectedTracks.length) {
          forcedRarity = Math.random() > 0.75 ? 'PLATINUM' : 'GOLD';
        }
        if (pack.id === 'hiphop' && (i + 1) === selectedTracks.length && !forcedRarity) {
          forcedRarity = 'GOLD';
        }

        // Pity
        const { pityCounters: pc } = usePlayerStore.getState();
        if (pc.PLATINUM >= 40) {
          forcedRarity = 'PLATINUM';
          resetPity('PLATINUM');
        } else if (pc.GOLD >= 10 && !forcedRarity) {
          forcedRarity = 'GOLD';
          resetPity('GOLD');
        }

        const card = generateCard(track, forcedRarity, undefined, mythicTrackIds);

        if (card.rarity === 'PLATINUM') {
          resetPity('PLATINUM'); resetPity('GOLD');
        } else if (card.rarity === 'GOLD') {
          resetPity('GOLD'); incrementPity('PLATINUM');
        } else {
          incrementPity('GOLD'); incrementPity('PLATINUM');
        }

        newCards.push(card);
        const { data: { session } } = await supabase.auth.getSession();
        const playerName = usePlayerStore.getState().discoveryUsername
          || session?.user?.user_metadata?.full_name
          || 'Un Jugador';
        logDiscovery(card, playerName);
      }

      if (spendRegalias(totalCost)) {
        const results: OpenedCardItem[] = newCards.map((card) => {
          const res = addCard(card);
          // Reveal automatically if not Platinum/Mythic
          const revealed = card.rarity !== 'PLATINUM' && card.rarity !== 'MYTHIC';
          return { card, isDuplicate: res.convertedToWildcard, revealed };
        });

        const rarityOrder = { BRONZE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3, MYTHIC: 4 };
        results.sort((a, b) => (rarityOrder[a.card.rarity] || 0) - (rarityOrder[b.card.rarity] || 0));

        setOpenedCards(results);
        setCurrentPack(pack);
        setRevealingAll(false);
        setIsOpening(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al abrir el sobre. Intenta de nuevo.');
    } finally {
      setLoading(null);
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
  };

  const closeOpening = () => {
    setIsOpening(false);
    setOpenedCards([]);
    setCurrentPack(null);
    setRevealingAll(false);
  };

  const allRevealed = openedCards.length > 0 && openedCards.every(c => c.revealed);

  const handleBuyPremium = async (amount: number, price: number, label: string) => {
    // Mock user profile for the logic
    const user = {
      id: 'local', username: 'Player', email: '...',
      role: usePlayerStore.getState().role,
      isPaying: usePlayerStore.getState().isPaying,
      totalSpent: 0,
      joinedAt: Date.now(),
      verifiedEmail: true,
      canSeeAds: !usePlayerStore.getState().isPaying
    };

    const res = await processPurchase(user, price, 'premium_gold');
    if (res.success && res.updatedUser) {
      usePlayerStore.getState().setPayingStatus(true);
      usePlayerStore.getState().addPremiumGold(amount);
      toast.success(res.message);
    }
  };

  return (
    <div className="flex flex-col gap-8 relative min-h-screen pb-28">

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">
            🎵 <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Colección</span>
          </h1>
          <p className="text-gray-500 text-sm">Abre sobres y descubre cartas únicas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-black text-amber-300 text-lg">
              {mounted ? regalias.toLocaleString() : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-2xl">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="font-black text-yellow-200 text-lg">
              {mounted ? (premiumGold || 0).toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
        {(['packs', 'premium', 'cosmetics'] as const)
          .filter(tab => {
            if (tab === 'premium') return featureFlags.ads; // assuming premium removes ads
            if (tab === 'cosmetics') return featureFlags.cosmetics;
            return true;
          })
          .map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveStoreTab(tab)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStoreTab === tab ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
      </div>

      {activeStoreTab === 'packs' && (
        <div className="space-y-8">
          {/* PITY COUNTER */}
          {mounted && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm">⭐</div>
                <div>
                  <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Pity GOLD</p>
                  <p className="text-sm font-bold text-yellow-300">{10 - pityCounters.GOLD} más</p>
                </div>
              </div>
              <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm">💎</div>
                <div>
                  <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider">Pity PLATINUM</p>
                  <p className="text-sm font-bold text-cyan-300">{40 - pityCounters.PLATINUM} más</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PACK_TYPES.map((pack) => {
              const isLoading = loading === pack.id;
              const canAfford = mounted && regalias >= pack.cost;

              return (
                <div
                  key={pack.id}
                  className={`relative overflow-hidden rounded-3xl border ${pack.accent} bg-gradient-to-br ${pack.gradient} p-5 flex flex-col gap-4 transition-all hover:scale-[1.01] group`}
                >
                  <div className="absolute inset-0 bg-white/[0.02] group-hover:bg-white/[0.05] transition-colors pointer-events-none" />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{pack.emoji}</div>
                      <div>
                        <h3 className="text-xl font-black leading-tight">{t(language, 'store', pack.nameKey) || pack.nameKey}</h3>
                        <p className="text-xs text-gray-400">{t(language, 'store', pack.descKey) || pack.descKey}</p>
                      </div>
                    </div>
                    <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-110 transform duration-300">
                      <Pack type={pack.id.toUpperCase() as any} className="scale-75 origin-right" />
                    </div>
                  </div>
                  <div className="relative z-10 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex flex-col gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Garantía</p>
                      <p className="text-xs font-bold text-white">{pack.guarantee}</p>
                    </div>
                    {/* Feature 7: Miniaturas de cartas de ejemplo */}
                    <div className="flex gap-1 overflow-hidden pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-8 h-12 bg-white/10 rounded border border-white/5 flex items-center justify-center">
                          <Music2 className="w-3 h-3" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 relative z-10">
                    <button onClick={() => handleBuyPack(pack, 1)} disabled={!!loading || !canAfford} className="flex-1 bg-white text-black font-black text-sm py-3 rounded-2xl disabled:opacity-40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{pack.cost.toLocaleString()} ✦</>}
                    </button>
                    <button onClick={() => handleBuyPack(pack, 5)} disabled={!!loading || !mounted || regalias < pack.cost * 5} className="bg-white/10 border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-2xl disabled:opacity-40 hover:bg-white/20 transition-all">×5</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeStoreTab === 'premium' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950 to-green-950 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles className="w-32 h-32 text-emerald-400" /></div>
            <div className="relative z-10">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Promoción Única</p>
              <h3 className="text-2xl font-black text-white italic tracking-tighter mb-2">SIN ANUNCIOS FOREVER</h3>
              <p className="text-sm text-emerald-200/60 max-w-xs mb-6 font-medium">Cualquier compra de Oro Premium te otorga el status de donador y elimina los anuncios de forma permanente.</p>
              <div className="inline-flex items-center gap-2 bg-emerald-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Star className="w-3 h-3 fill-black" /> ¡Recomendado!
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { amount: 500, price: 4.99, label: 'Puñado de Oro', icon: '💰' },
              { amount: 1200, price: 9.99, label: 'Cofre de Oro', icon: '💎', popular: true },
              { amount: 6500, price: 49.99, label: 'Montaña de Oro', icon: '🏔️' },
            ].map((item) => (
              <div key={item.amount} className={`relative bg-white/5 border ${item.popular ? 'border-yellow-500/50' : 'border-white/10'} rounded-2xl p-6 flex flex-col items-center gap-4 group hover:scale-[1.02] transition-all`}>
                {item.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-yellow-500/20">Más Popular</div>}
                <div className="text-4xl group-hover:scale-110 transition-transform">{item.icon}</div>
                <div className="text-center">
                  <h4 className="text-sm font-black text-white uppercase">{item.label}</h4>
                  <p className="text-xs text-yellow-500 font-black flex items-center justify-center gap-1"><Zap className="w-3 h-3 fill-yellow-500" /> {item.amount}</p>
                </div>
                <button
                  onClick={() => handleBuyPremium(item.amount, item.price, item.label)}
                  className="w-full bg-white text-black font-black py-3 rounded-xl hover:scale-105 active:scale-95 transition-all text-xs"
                >
                  ${item.price}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeStoreTab === 'cosmetics' && (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <Disc3 className="w-16 h-16 text-purple-500/40 mx-auto mb-4 animate-spin-slow" />
          <h3 className="text-xl font-black text-white italic tracking-tighter">PRÓXIMAMENTE</h3>
          <p className="text-sm text-gray-500 font-medium mt-2">Skins para tus cartas, reversos animados y avatares exclusivos.</p>
        </div>
      )}

      {/* ══════════════════════════════════════
          MODAL DE APERTURA DE SOBRE (UNIFICADO)
      ══════════════════════════════════════ */}
      <PackOpenModal
        isOpen={isOpening}
        cards={openedCards}
        onClose={closeOpening}
        onRevealCard={revealCard}
        onRevealAll={revealAll}
        isRevealingAll={revealingAll}
        title={currentPack ? (t(language, 'store', currentPack.nameKey) || currentPack.nameKey) : 'Sobre Abierto'}
        subtitle={currentPack?.guarantee}
      />

      {/* Inspection Modal in Store */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl p-4 sm:p-8"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center gap-8 max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <Card data={selectedCard} isBig={true} className="w-80 sm:w-96 shadow-[0_0_60px_rgba(255,255,255,0.1)]" />

              <div className="flex gap-4 w-full max-w-md">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
