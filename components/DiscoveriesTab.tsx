'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getRecentDiscoveries, getGlobalStats } from '@/lib/discovery';
import { Globe, Music, Sparkles, Trophy, Flame, Users, Share2, Play, Search, Filter, Disc, ArrowUpRight } from 'lucide-react';
import Card from '@/components/cards/Card';
import { CardData } from '@/lib/engine/generator';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '@/lib/i18n';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { toast } from 'sonner';
import { shareCardAsImage } from '@/lib/share';
import Image from 'next/image';

export default function DiscoveriesTab() {
    const { language } = usePlayerStore();
    const { playTrack } = useMusicPlayer();
    const [recentDiscoveries, setRecentDiscoveries] = useState<any[]>([]);
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
    const [filter, setFilter] = useState<'all' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [discoveries, stats] = await Promise.all([
                    getRecentDiscoveries(80),
                    getGlobalStats()
                ]);
                setRecentDiscoveries(discoveries);
                setGlobalStats(stats);
            } catch (err) {
                console.error('Error fetching discoveries:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredDiscoveries = recentDiscoveries.filter(d => {
        const matchesFilter = filter === 'all' || d.rarity === filter;
        const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.artist.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handlePlayPreview = (card: CardData) => {
        if (card.previewUrl) {
            playTrack({
                id: card.id,
                url: card.previewUrl,
                title: card.name,
                artist: card.artist,
                artworkUrl: card.artworkUrl
            });
            toast.success(`Reproduciendo: ${card.name}`);
        }
    };

    const handleShare = async (card: CardData) => {
        try {
            toast.info('Generando imagen de gala...');
            await shareCardAsImage('share-card-container-discovery', `discovery-${card.name.replace(/\s+/g, '-')}`);
            toast.success('Imagen capturada con éxito.');
        } catch (err) {
            toast.error('Error al exportar el hallazgo.');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="relative">
                    <div className="w-20 h-20 border-2 border-white/5 rounded-full" />
                    <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin" />
                    <Globe className="absolute inset-0 m-auto w-8 h-8 text-cyan-500 animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-white font-black uppercase tracking-[0.3em] text-sm italic">Sincronizando Archivos</p>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Accediendo a la red global de coleccionistas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 w-full animate-in fade-in duration-700">
            {/* Header section with Stats */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                <Globe className="w-8 h-8 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white flex items-center gap-2">
                                    Hallazgos <span className="text-blue-500">Globales</span>
                                </h2>
                                <p className="text-gray-500 text-sm font-medium">Cronología en tiempo real de los descubrimientos más prestigiosos.</p>
                            </div>
                        </div>
                    </div>

                    {globalStats && (
                        <div className="flex gap-4 p-1 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                            <div className="px-6 py-4 rounded-2xl bg-white/5 flex flex-col items-center border border-white/5">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Unidades</span>
                                <span className="text-2xl font-black text-white">{globalStats.totalUnique}</span>
                            </div>
                            <div className="px-6 py-4 rounded-2xl bg-blue-500/10 flex flex-col items-center border border-blue-500/20">
                                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Menciones</span>
                                <span className="text-2xl font-black text-blue-400">{globalStats.totalDiscoveries}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 no-scrollbar">
                        {(['all', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border-2 ${filter === f
                                    ? 'bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                    : 'bg-zinc-900 border-white/5 text-gray-500 hover:border-white/20'
                                    }`}
                            >
                                {f === 'all' ? 'Ver Todos' : f}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar artista o canción..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900/50 border-2 border-white/5 rounded-2xl pl-12 pr-6 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                        />
                    </div>
                </div>
            </div>

            {/* Rare Distribution */}
            {globalStats && (
                <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(globalStats.rarityCounts).map(([rarity, count]: [any, any]) => (
                        <div key={rarity} className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-xl flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${rarity === 'PLATINUM' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' :
                                rarity === 'GOLD' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                                    rarity === 'SILVER' ? 'bg-gray-400' : 'bg-orange-600'
                                }`} />
                            <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{rarity}</span>
                            <span className="text-xs font-black text-white">{count}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredDiscoveries.map((discovery, i) => (
                        <motion.div
                            key={discovery.id || i}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: (i % 10) * 0.05 }}
                            onClick={() => {
                                const cardData: CardData = {
                                    id: discovery.id,
                                    name: discovery.name,
                                    artist: discovery.artist,
                                    album: discovery.album || '',
                                    genre: discovery.genre || '',
                                    artworkUrl: discovery.artworkUrl,
                                    previewUrl: discovery.previewUrl || '',
                                    rarity: discovery.rarity,
                                    type: discovery.type === 'SINGLE' ? 'CREATURE' : (discovery.type || 'CREATURE'),
                                    atk: discovery.stats?.atk || 0,
                                    def: discovery.stats?.def || 0,
                                    stats: discovery.stats || { atk: 0, def: 0 },
                                    cost: discovery.cost || 1,
                                    abilities: discovery.abilities || [],
                                    keywords: discovery.keywords || [],
                                    themeColor: discovery.themeColor || '#1e3a8a'
                                };
                                setSelectedCard(cardData);
                            }}
                            className="group relative bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden cursor-pointer hover:border-white/20 transition-all hover:shadow-2xl hover:shadow-white/5 hover:-translate-y-1"
                        >
                            <div className="aspect-[4/5] relative">
                                <Image
                                    src={discovery.artworkUrl}
                                    alt={discovery.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-[1500ms]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />

                                {/* Rarity Badge */}
                                <div className="absolute top-4 right-4">
                                    <div className={`p-1.5 rounded-xl border backdrop-blur-md ${discovery.rarity === 'PLATINUM' ? 'bg-cyan-500/10 border-cyan-400/50' :
                                        discovery.rarity === 'GOLD' ? 'bg-amber-500/10 border-amber-400/50' :
                                            discovery.rarity === 'SILVER' ? 'bg-white/10 border-white/20' : 'bg-orange-950/20 border-orange-400/30'
                                        }`}>
                                        <Sparkles className={`w-4 h-4 ${discovery.rarity === 'PLATINUM' ? 'text-cyan-400' :
                                            discovery.rarity === 'GOLD' ? 'text-amber-400' :
                                                'text-white'
                                            }`} />
                                    </div>
                                </div>

                                {/* Discovery User Overlay */}
                                <div className="absolute bottom-4 left-4 right-4 space-y-1">
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <Users className="w-3 h-3 text-blue-400" />
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter truncate">
                                            {discovery.discoveredBy || 'Anónimo'}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black text-white truncate leading-none uppercase tracking-tighter">{discovery.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-widest">{discovery.artist}</p>
                                </div>
                            </div>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-transform duration-500">
                                <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl">
                                    <ArrowUpRight className="w-6 h-6" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty state */}
            {filteredDiscoveries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <Disc className="w-16 h-16 text-zinc-800 animate-spin-slow" />
                    <div className="space-y-1">
                        <p className="text-white font-black uppercase tracking-widest">Sin registros</p>
                        <p className="text-gray-500 text-xs">No hay hallazgos que coincidan con tu búsqueda.</p>
                    </div>
                </div>
            )}

            {/* Modal de Detalle (Glassmorphism) */}
            <AnimatePresence>
                {selectedCard && (
                    <div
                        className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4"
                        onClick={() => setSelectedCard(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="flex flex-col items-center gap-10 max-w-xl w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div
                                className="relative group perspective-1000"
                                id="share-card-container-discovery"
                            >
                                <Card data={selectedCard} className="w-80 sm:w-[480px] shadow-[0_0_80px_rgba(34,211,238,0.2)]" />

                                {selectedCard.previewUrl && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePlayPreview(selectedCard); }}
                                        aria-label="Reproducir preview"
                                        className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500 text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <Play size={32} fill="currentColor" />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-4 w-full max-w-sm">
                                <button
                                    onClick={() => handleShare(selectedCard)}
                                    className="flex-1 py-5 bg-white text-black font-black uppercase tracking-widest rounded-3xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-xl"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Capturar
                                </button>
                                <button
                                    onClick={() => setSelectedCard(null)}
                                    className="px-8 py-5 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest rounded-3xl hover:bg-white/10 transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <div className="text-center p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm max-w-xs">
                                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Archivo Global</p>
                                <p className="text-gray-500 text-xs italic font-medium leading-relaxed">
                                    &quot;Testimonio de la diversidad musical que define nuestro catálogo.&quot;
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
