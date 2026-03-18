'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getRecentDiscoveries, getGlobalStats } from '@/lib/discovery';
import { Globe, Music, Sparkles, BarChart3, TrendingUp, Users, Heart, Share2, Play } from 'lucide-react';
import Card from '@/components/cards/Card';
import MiniCard from '@/components/cards/MiniCard';
import { CardData } from '@/lib/engine/generator';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '@/lib/i18n';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { toast } from 'sonner';
import { shareCardAsImage } from '@/lib/share';

export default function DiscoveriesTab() {
    const { language } = usePlayerStore();
    const { playTrack } = useMusicPlayer();
    const [recentDiscoveries, setRecentDiscoveries] = useState<any[]>([]);
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
    const [filter, setFilter] = useState<'all' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE'>('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [discoveries, stats] = await Promise.all([
                    getRecentDiscoveries(50),
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

    const filteredDiscoveries = filter === 'all'
        ? recentDiscoveries
        : recentDiscoveries.filter(d => d.rarity === filter);

    const handlePlayPreview = (card: CardData) => {
        if (card.previewUrl) {
            playTrack({
                id: card.id,
                url: card.previewUrl,
                title: card.name,
                artist: card.artist,
                artUrl: card.artUrl
            });
        }
    };

    const handleShare = async (card: CardData) => {
        try {
            toast.info(t(language, 'studio', 'generatingImage') || 'Generando imagen...');
            await shareCardAsImage('share-card-container-discovery', `discovery-${card.name.replace(/\s+/g, '-')}`);
            toast.success(t(language, 'studio', 'shareSuccess') || 'Imagen descargada correctamente.');
        } catch (err) {
            toast.error(t(language, 'studio', 'shareError') || 'Error al generar la imagen.');
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                    <Globe className="w-6 h-6 text-blue-500" />
                    {t(language, 'home', 'globalDiscoveries') || 'Hallazgos Globales'}
                </h2>
                <p className="text-gray-400 text-sm">Descubre quién ha encontrado las cartas más raras del mundo.</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando con la red...</p>
                </div>
            ) : (
                <>
                    {/* Global Stats Grid */}
                    {globalStats && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-[#121212] border border-white/10 p-4 rounded-2xl">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total Únicas</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-black">{globalStats.totalUnique}</span>
                                    <Music className="w-4 h-4 text-blue-500 mb-1" />
                                </div>
                            </div>
                            <div className="bg-[#121212] border border-white/10 p-4 rounded-2xl">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Hallazgos Totales</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-black">{globalStats.totalDiscoveries}</span>
                                    <Sparkles className="w-4 h-4 text-yellow-500 mb-1" />
                                </div>
                            </div>
                            <div className="bg-[#121212] border border-white/10 p-4 rounded-2xl col-span-2">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Distribución de Rarezas</p>
                                <div className="flex gap-2">
                                    {Object.entries(globalStats.rarityCounts).map(([rarity, count]: [any, any]) => (
                                        <div key={rarity} className="flex-1 flex flex-col items-center bg-white/5 rounded-lg py-1 px-2 border border-white/5">
                                            <span className={`text-[8px] font-black ${rarity === 'PLATINUM' ? 'text-cyan-400' :
                                                rarity === 'GOLD' ? 'text-amber-400' :
                                                    rarity === 'SILVER' ? 'text-gray-300' : 'text-[#cd7f32]'
                                                }`}>{rarity[0]}</span>
                                            <span className="text-xs font-bold">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(['all', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white text-black shadow-lg scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : f}
                            </button>
                        ))}
                    </div>

                    {/* Discoveries Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredDiscoveries.map((discovery, i) => (
                                <motion.div
                                    key={discovery.id || i}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative flex flex-col bg-[#121212] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer"
                                    onClick={() => {
                                        // Reconstruct card data for preview
                                        const cardData: CardData = {
                                            id: discovery.id,
                                            name: discovery.name,
                                            artist: discovery.artist,
                                            album: discovery.album || '',
                                            genre: discovery.genre || '',
                                            artUrl: discovery.artUrl,
                                            previewUrl: discovery.previewUrl || '',
                                            rarity: discovery.rarity,
                                            type: discovery.type || 'SINGLE',
                                            stats: discovery.stats || { atk: 0, def: 0 },
                                            cost: discovery.cost || 1,
                                            abilities: discovery.abilities || [],
                                            themeColor: discovery.themeColor || '#1e3a8a'
                                        };
                                        setSelectedCard(cardData);
                                    }}
                                >
                                    <div className="aspect-square relative overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={discovery.artUrl}
                                            alt={discovery.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                        <div className="absolute top-2 right-2">
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border shadow-xl ${discovery.rarity === 'PLATINUM' ? 'bg-cyan-950 text-cyan-400 border-cyan-400/50' :
                                                discovery.rarity === 'GOLD' ? 'bg-amber-950 text-amber-400 border-amber-400/50' :
                                                    discovery.rarity === 'SILVER' ? 'bg-zinc-800 text-gray-300 border-white/20' : 'bg-orange-950 text-[#cd7f32] border-orange-400/30'
                                                }`}>
                                                {discovery.rarity}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase truncate mb-0.5">{discovery.artist}</p>
                                        <p className="text-sm font-black truncate">{discovery.name}</p>

                                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] text-gray-600 uppercase font-black">Descubierto por</span>
                                                <span className="text-[10px] font-bold text-blue-400 truncate max-w-[80px]">
                                                    {discovery.discoveredBy || 'Anónimo'}
                                                </span>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                                                <Users className="w-3 h-3 text-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* Card Detail Modal */}
            <AnimatePresence>
                {selectedCard && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setSelectedCard(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="flex flex-col items-center gap-8 max-w-md w-full py-10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div
                                className="relative group w-full flex justify-center"
                                id="share-card-container-discovery"
                            >
                                <Card data={selectedCard} className="w-80 sm:w-88" />
                                {selectedCard.previewUrl && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePlayPreview(selectedCard); }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors rounded-xl"
                                    >
                                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">
                                            <Play size={40} className="text-white ml-2" fill="currentColor" />
                                        </div>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full px-4">
                                <button
                                    onClick={() => handleShare(selectedCard)}
                                    className="py-4 bg-blue-500 hover:bg-blue-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Compartir
                                </button>
                                <button
                                    onClick={() => setSelectedCard(null)}
                                    className="py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest rounded-2xl transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <div className="text-center px-6">
                                <p className="text-gray-500 text-xs italic">
                                    "Esta pieza única fue añadida al catálogo global por un coleccionista visionario."
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
