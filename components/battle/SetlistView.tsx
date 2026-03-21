'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CardData } from '@/lib/engine/generator';
import { PlaylistSynergy } from '@/types/playlistCombat';
import { ChevronDown, ChevronUp, Music, Zap, Shield, Star, BarChart2, Shuffle } from 'lucide-react';

interface SetlistViewProps {
    // Datos del jugador
    username: string;
    fullPlaylist: CardData[];         // Toda la colección visible
    upcomingTracks: CardData[];       // Próximas 5 (también visible)
    currentTrack: CardData | null;    // La que está en juego ahora
    pastTracks: CardData[];           // Historial de la batalla
    activeSynergies: PlaylistSynergy[];

    // Estilo
    side?: 'left' | 'right';
    isOpponent?: boolean;             // Si es del rival, oculta el detalle
}

// Colores por rareza
const RARITY_COLORS = {
    BRONZE: 'text-amber-700 bg-amber-900/30 border-amber-700/50',
    SILVER: 'text-gray-300 bg-gray-800/50 border-gray-500/50',
    GOLD: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50',
    PLATINUM: 'text-cyan-300 bg-cyan-900/30 border-cyan-400/50',
};

const RARITY_DOT = {
    BRONZE: 'bg-amber-700',
    SILVER: 'bg-gray-400',
    GOLD: 'bg-yellow-400',
    PLATINUM: 'bg-cyan-400',
};

function MiniTrackRow({ track, index }: { track: CardData; index: number }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="relative flex items-center gap-2 rounded-lg p-2 bg-white/5 hover:bg-white/10 transition-all cursor-default border border-white/5"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span className="text-[10px] text-gray-500 w-4 shrink-0 font-mono">#{index + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={track.artworkUrl ? track.artworkUrl.replace('http://', 'https://') : ''}
                alt={track.name}
                className="w-8 h-8 rounded object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-white">{track.name}</p>
                <p className="text-[9px] text-gray-400 truncate">{track.artist}</p>
            </div>
            <div className="flex gap-1 shrink-0">
                <span className="text-[9px] text-red-300 bg-red-900/30 px-1.5 py-0.5 rounded">
                    {track.stats?.atk ?? 0}
                </span>
                <span className="text-[9px] text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">
                    {track.stats?.def ?? 0}
                </span>
            </div>

            {/* Tooltip de habilidades */}
            <AnimatePresence>
                {hovered && track.abilities && track.abilities.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 bottom-full mb-1 z-50 bg-[#1a1a1a] border border-white/20 rounded-lg p-2 w-52 shadow-xl pointer-events-none"
                    >
                        {track.abilities.map((ab, i) => (
                            <div key={i} className="text-[10px]">
                                {ab.keyword && (
                                    <span className="font-bold text-amber-300 mr-1">{ab.keyword}:</span>
                                )}
                                <span className="text-gray-300">{ab.description}</span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SetlistView({
    username,
    fullPlaylist,
    upcomingTracks,
    currentTrack,
    pastTracks,
    activeSynergies,
    side = 'left',
    isOpponent = false,
}: SetlistViewProps) {
    const [tab, setTab] = useState<'upcoming' | 'all' | 'synergies'>('upcoming');
    const [collapsed, setCollapsed] = useState(false);

    const stats = useMemo(() => {
        if (fullPlaylist.length === 0) return { avgAtk: 0, avgDef: 0, avgCost: 0 };
        return {
            avgAtk: +(fullPlaylist.reduce((s, c) => s + (c.stats?.atk ?? 0), 0) / fullPlaylist.length).toFixed(1),
            avgDef: +(fullPlaylist.reduce((s, c) => s + (c.stats?.def ?? 0), 0) / fullPlaylist.length).toFixed(1),
            avgCost: +(fullPlaylist.reduce((s, c) => s + c.cost, 0) / fullPlaylist.length).toFixed(1),
        };
    }, [fullPlaylist]);

    // Conteo de rarezas
    const rarityCounts = useMemo(() => {
        return fullPlaylist.reduce((acc, c) => {
            acc[c.rarity] = (acc[c.rarity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [fullPlaylist]);

    return (
        <motion.div
            layout
            className={`bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col ${side === 'right' ? 'items-end' : 'items-start'
                }`}
            style={{ maxHeight: collapsed ? 80 : 480 }}
        >
            {/* HEADER */}
            <div
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
                onClick={() => setCollapsed(c => !c)}
            >
                <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">{username}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{fullPlaylist.length} canciones</span>
                </div>
                <div className="flex items-center gap-2">
                    {activeSynergies.length > 0 && (
                        <motion.span
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-[10px] bg-emerald-600/80 text-emerald-100 px-2 py-0.5 rounded-full font-bold"
                        >
                            ✨ {activeSynergies.length} Sinergia{activeSynergies.length !== 1 ? 's' : ''}
                        </motion.span>
                    )}
                    {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                </div>
            </div>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full flex flex-col flex-1 min-h-0"
                    >
                        {/* AHORA TOCANDO */}
                        {currentTrack && (
                            <div className="px-3 py-2 bg-emerald-950/30 border-b border-white/5">
                                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mb-1">▶ Ahora tocando</p>
                                <div className="flex items-center gap-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={currentTrack.artworkUrl?.replace('http://', 'https://') || ''}
                                        alt={currentTrack.name}
                                        className="w-10 h-10 rounded object-cover border border-emerald-500/30"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{currentTrack.name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{currentTrack.artist}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[9px] text-red-300 bg-red-900/30 px-1.5 py-0.5 rounded">
                                                ⚔️ {currentTrack.stats?.atk ?? 0}
                                            </span>
                                            <span className="text-[9px] text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                🛡️ {currentTrack.stats?.def ?? 0}
                                            </span>
                                            <span className="text-[9px] text-amber-300 bg-amber-900/30 px-1.5 py-0.5 rounded">
                                                ⚡ {currentTrack.cost}
                                            </span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${RARITY_COLORS[currentTrack.rarity]}`}>
                                                {currentTrack.rarity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TABS */}
                        <div className="flex border-b border-white/10">
                            {(['upcoming', 'all', 'synergies'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${tab === t ? 'text-white border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    {t === 'upcoming' ? '📋 Queue' : t === 'all' ? '🎵 Playlist' : '✨ Sinergias'}
                                </button>
                            ))}
                        </div>

                        {/* CONTENIDO */}
                        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                            {/* TAB: UPCOMING (próximas 5) */}
                            {tab === 'upcoming' && (
                                <>
                                    <p className="text-[9px] text-gray-500 mb-2 flex items-center gap-1">
                                        <Shuffle className="w-3 h-3" />
                                        Orden aleatorio — puedes anticipar y prepararte
                                    </p>
                                    {upcomingTracks.length > 0 ? (
                                        upcomingTracks.map((track, i) => (
                                            <MiniTrackRow key={`${track.id}-${i}`} track={track} index={i} />
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-xs text-center py-4">Sin cartas en cola</p>
                                    )}
                                </>
                            )}

                            {/* TAB: ALL (toda la playlist) */}
                            {tab === 'all' && (
                                <>
                                    {/* Stats resumen */}
                                    <div className="grid grid-cols-3 gap-1 mb-2">
                                        <div className="bg-red-900/20 rounded p-1 text-center">
                                            <p className="text-[8px] text-red-400">ATK Prom.</p>
                                            <p className="text-xs font-bold text-red-300">{stats.avgAtk}</p>
                                        </div>
                                        <div className="bg-blue-900/20 rounded p-1 text-center">
                                            <p className="text-[8px] text-blue-400">DEF Prom.</p>
                                            <p className="text-xs font-bold text-blue-300">{stats.avgDef}</p>
                                        </div>
                                        <div className="bg-amber-900/20 rounded p-1 text-center">
                                            <p className="text-[8px] text-amber-400">Costo Prom.</p>
                                            <p className="text-xs font-bold text-amber-300">{stats.avgCost}</p>
                                        </div>
                                    </div>

                                    {/* Rarezas */}
                                    <div className="flex gap-1 flex-wrap mb-2">
                                        {(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const).map(r => (
                                            rarityCounts[r] ? (
                                                <span key={r} className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${RARITY_COLORS[r]}`}>
                                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${RARITY_DOT[r]}`} />
                                                    {rarityCounts[r]}
                                                </span>
                                            ) : null
                                        ))}
                                    </div>

                                    {/* Grid de cartas */}
                                    {!isOpponent ? (
                                        <div className="grid grid-cols-8 gap-1">
                                            {fullPlaylist.map((card, i) => (
                                                <div key={`${card.id}-${i}`} className="relative group aspect-square">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={card.artworkUrl?.replace('http://', 'https://') || ''}
                                                        alt={card.name}
                                                        className="w-full h-full rounded object-cover opacity-80 hover:opacity-100 transition"
                                                        onError={(e) => {
                                                            const el = e.target as HTMLImageElement;
                                                            el.src = '';
                                                            el.style.background = '#333';
                                                        }}
                                                    />
                                                    <div className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${RARITY_DOT[card.rarity]}`} />
                                                    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 bg-black border border-white/20 rounded p-2 text-[9px] text-gray-200 w-36 pointer-events-none shadow-xl">
                                                        <p className="font-bold truncate">{card.name}</p>
                                                        <p className="text-gray-400 truncate">{card.artist}</p>
                                                        <p className="mt-1">⚔️{card.stats?.atk} 🛡️{card.stats?.def} ⚡{card.cost}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-xs text-center py-4">Playlist del rival oculta 🕵️</p>
                                    )}
                                </>
                            )}

                            {/* TAB: SINERGIAS */}
                            {tab === 'synergies' && (
                                <>
                                    {activeSynergies.length > 0 ? (
                                        <>
                                            <p className="text-[9px] text-emerald-400 font-bold mb-2">🔥 Activas ahora:</p>
                                            {activeSynergies.map(s => (
                                                <motion.div
                                                    key={s.id}
                                                    initial={{ scale: 0.95, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="bg-emerald-900/20 border border-emerald-600/40 rounded-lg p-2 mb-1"
                                                >
                                                    <p className="text-xs font-bold text-emerald-300">{s.name}</p>
                                                    <p className="text-[10px] text-gray-400">{s.description}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        {s.bonus.atk && <span className="text-[9px] text-red-300">+{s.bonus.atk} ATK</span>}
                                                        {s.bonus.def && <span className="text-[9px] text-blue-300">+{s.bonus.def} DEF</span>}
                                                        {s.bonus.hype && <span className="text-[9px] text-purple-300">+{s.bonus.hype} Hype</span>}
                                                        {s.bonus.energy && <span className="text-[9px] text-amber-300">+{s.bonus.energy} ⚡</span>}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </>
                                    ) : (
                                        <p className="text-gray-500 text-xs text-center py-2">Sin sinergias activas este turno</p>
                                    )}

                                    <p className="text-[9px] text-gray-500 mt-3 mb-1">Sinergias disponibles en el sistema:</p>
                                    {/* Lista de todas las sinergias posibles, marcadas si están activas */}
                                    {/* (import PLAYLIST_SYNERGIES from engine) */}
                                </>
                            )}
                        </div>

                        {/* HISTORIAL (Footer) */}
                        {pastTracks.length > 0 && (
                            <div className="px-3 py-2 border-t border-white/5 bg-white/2">
                                <p className="text-[9px] text-gray-600 mb-1">Tocadas: {pastTracks.length}</p>
                                <div className="flex gap-1 overflow-x-auto">
                                    {pastTracks.slice(-6).map((t, i) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            key={`${t.id}-${i}`}
                                            src={t.artworkUrl?.replace('http://', 'https://') || ''}
                                            alt={t.name}
                                            title={t.name}
                                            className="w-6 h-6 rounded object-cover opacity-50 shrink-0"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
